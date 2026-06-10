import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { RenderTemplate } from '../../types/render-types';
import { PrismaService } from '../../prisma/prisma.service';
import { DataSourceService } from '../data-source/data-source.service';
import { TemplateService } from '../template/template.service';
import { runRenderWorker, cleanupJobDir } from './render.worker';

export interface RenderJob {
  jobId: string;
  templateId: string;
  dataSourceId: string;
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total: number;
  success: number;
  failed: number;
  progress: number;
  errors: { rowIndex: number; pageIndex?: number; message: string }[];
  downloadUrl: string | null;
  zipPath: string | null;
  zipFileName: string;
}

function toRenderJob(record: any): RenderJob {
  return {
    jobId: record.jobId,
    templateId: record.templateId ?? '',
    dataSourceId: record.dataSourceId ?? '',
    status: record.status,
    total: record.total,
    success: record.success,
    failed: record.failed,
    progress: record.progress,
    errors: JSON.parse(record.errorsJson ?? '[]'),
    downloadUrl: record.downloadUrl ?? null,
    zipPath: record.zipPath ?? null,
    zipFileName: record.zipFileName ?? '',
  };
}

@Injectable()
export class RenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataSourceService: DataSourceService,
    private readonly templateService: TemplateService,
  ) {}

  async createJob(body: {
    templateId: string;
    dataSourceId: string;
    outputType?: string;
    range?: { type: string; from?: number; to?: number };
    options?: {
      fileNamePrefix?: string;
      fileNameTemplate?: string;
      multiplier?: number;
    };
    templateSnapshot?: RenderTemplate;
  }): Promise<{ jobId: string; status: string }> {
    const source = await this.dataSourceService.getById(body.dataSourceId);

    let template: RenderTemplate | undefined = body.templateSnapshot;
    if (!template) {
      template = await this.templateService.findOneAsRenderTemplate(
        body.templateId,
      );
    }
    if (!template?.pages?.length) {
      throw new BadRequestException('Template not found or has no pages');
    }

    // snapshot 入库，保证服务重启后任务记录可追溯
    if (body.templateSnapshot) {
      await this.templateService.update(body.templateId, body.templateSnapshot);
    }

    const rows = this.filterRows(source.rows, body.range);
    const pageCount = template.pages.length;
    const total = rows.length * pageCount;
    const fileNamePrefix =
      body.options?.fileNamePrefix || template.name || 'label';

    const jobId = `job_${uuidv4().slice(0, 8)}`;
    const job: RenderJob = {
      jobId,
      templateId: body.templateId,
      dataSourceId: body.dataSourceId,
      status: 'WAITING',
      total,
      success: 0,
      failed: 0,
      progress: 0,
      errors: [],
      downloadUrl: null,
      zipPath: null,
      zipFileName: `${fileNamePrefix}.zip`,
    };

    await this.prisma.renderJob.create({
      data: {
        jobId,
        templateId: body.templateId,
        dataSourceId: body.dataSourceId,
        outputType: body.outputType ?? 'zip',
        status: 'WAITING',
        total,
        zipFileName: job.zipFileName,
      },
    });

    this.processJobAsync(jobId, template, rows, {
      fileNamePrefix,
      fileNameTemplate: body.options?.fileNameTemplate,
      multiplier: body.options?.multiplier,
    });

    return { jobId, status: 'WAITING' };
  }

  async getJob(jobId: string): Promise<RenderJob> {
    const record = await this.prisma.renderJob.findUnique({
      where: { jobId },
    });
    if (!record) throw new NotFoundException('Job not found');
    return toRenderJob(record);
  }

  async getJobZipPath(jobId: string): Promise<{
    zipPath: string;
    fileName: string;
  }> {
    const job = await this.getJob(jobId);
    if (job.status !== 'COMPLETED' || !job.zipPath) {
      throw new NotFoundException('ZIP not ready');
    }
    return { zipPath: job.zipPath, fileName: job.zipFileName };
  }

  private filterRows(
    rows: Record<string, string | number>[],
    range?: { type: string; from?: number; to?: number },
  ): Record<string, string | number>[] {
    if (!range || range.type === 'all') return rows;
    if (range.type === 'rows') {
      const from = Math.max(1, range.from ?? 1);
      const to = Math.min(rows.length, range.to ?? rows.length);
      return rows.slice(from - 1, to);
    }
    return rows;
  }

  private processJobAsync(
    jobId: string,
    template: RenderTemplate,
    rows: Record<string, string | number>[],
    options: {
      fileNamePrefix: string;
      fileNameTemplate?: string;
      multiplier?: number;
    },
  ): void {
    // 标记开始
    this.prisma.renderJob
      .update({
        where: { jobId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      })
      .catch(() => {});

    runRenderWorker({
      template,
      rows,
      jobId,
      fileNamePrefix: options.fileNamePrefix,
      fileNameTemplate: options.fileNameTemplate,
      multiplier: options.multiplier,
      onProgress: (state) => {
        // 进度更新节流到内存即可，完成后统一落库，避免高频写库
        this.prisma.renderJob
          .update({
            where: { jobId },
            data: {
              success: state.success,
              failed: state.failed,
              progress: state.progress,
              errorsJson: JSON.stringify(state.errors),
            },
          })
          .catch(() => {});
      },
    })
      .then(async (result) => {
        await this.prisma.renderJob.update({
          where: { jobId },
          data: {
            success: result.success,
            failed: result.failed,
            errorsJson: JSON.stringify(result.errors),
            progress: 100,
            zipPath: result.zipPath,
            status: 'COMPLETED',
            downloadUrl: `/api/render/jobs/${jobId}/download`,
            finishedAt: new Date(),
          },
        });
      })
      .catch(async (err) => {
        const errors = [
          {
            rowIndex: 0,
            message: err instanceof Error ? err.message : String(err),
          },
        ];
        await this.prisma.renderJob.update({
          where: { jobId },
          data: {
            status: 'FAILED',
            errorsJson: JSON.stringify(errors),
            finishedAt: new Date(),
          },
        });
        cleanupJobDir(jobId).catch(() => {});
      });
  }
}
