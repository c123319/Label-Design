import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { RenderTemplate } from '../../types/render-types';
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

@Injectable()
export class RenderService {
  private jobs = new Map<string, RenderJob>();

  constructor(
    private readonly dataSourceService: DataSourceService,
    private readonly templateService: TemplateService,
  ) {}

  createJob(body: {
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
  }): { jobId: string; status: string } {
    const source = this.dataSourceService.getById(body.dataSourceId);

    let template: RenderTemplate | undefined = body.templateSnapshot;
    if (!template) {
      template = this.templateService.findOne(body.templateId) as RenderTemplate | undefined;
    }
    if (!template?.pages?.length) {
      throw new BadRequestException('Template not found or has no pages');
    }

    if (body.templateSnapshot) {
      this.templateService.update(body.templateId, body.templateSnapshot);
    }

    const rows = this.filterRows(source.rows, body.range);
    const pageCount = template.pages.length;
    const total = rows.length * pageCount;
    const fileNamePrefix = body.options?.fileNamePrefix || template.name || 'label';

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
    this.jobs.set(jobId, job);

    this.processJobAsync(jobId, template, rows, {
      fileNamePrefix,
      fileNameTemplate: body.options?.fileNameTemplate,
      multiplier: body.options?.multiplier,
    });

    return { jobId, status: 'WAITING' };
  }

  getJob(jobId: string): RenderJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  getJobZipPath(jobId: string): { zipPath: string; fileName: string } {
    const job = this.getJob(jobId);
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
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';

    runRenderWorker({
      template,
      rows,
      jobId,
      fileNamePrefix: options.fileNamePrefix,
      fileNameTemplate: options.fileNameTemplate,
      multiplier: options.multiplier,
      onProgress: (state) => {
        const current = this.jobs.get(jobId);
        if (!current || current.status === 'FAILED') return;
        current.success = state.success;
        current.failed = state.failed;
        current.progress = state.progress;
        current.errors = state.errors;
      },
    })
      .then((result) => {
        const current = this.jobs.get(jobId);
        if (!current) return;
        current.success = result.success;
        current.failed = result.failed;
        current.errors = result.errors;
        current.progress = 100;
        current.zipPath = result.zipPath;
        current.status = 'COMPLETED';
        current.downloadUrl = `/api/render/jobs/${jobId}/download`;
      })
      .catch((err) => {
        const current = this.jobs.get(jobId);
        if (!current) return;
        current.status = 'FAILED';
        current.errors.push({
          rowIndex: 0,
          message: err instanceof Error ? err.message : String(err),
        });
        cleanupJobDir(jobId).catch(() => {});
      });
  }
}
