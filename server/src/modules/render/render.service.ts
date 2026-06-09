import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DataSourceService } from '../data-source/data-source.service';

export interface RenderJob {
  jobId: string;
  templateId: string;
  dataSourceId: string;
  status: 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  total: number;
  success: number;
  failed: number;
  progress: number;
  errors: { rowIndex: number; message: string }[];
  downloadUrl: string | null;
}

@Injectable()
export class RenderService {
  private jobs = new Map<string, RenderJob>();

  constructor(private readonly dataSourceService: DataSourceService) {}

  createJob(body: {
    templateId: string;
    dataSourceId: string;
    outputType?: string;
  }): { jobId: string; status: string } {
    const source = this.dataSourceService.getById(body.dataSourceId);
    const jobId = `job_${uuidv4().slice(0, 8)}`;
    const job: RenderJob = {
      jobId,
      templateId: body.templateId,
      dataSourceId: body.dataSourceId,
      status: 'WAITING',
      total: source.totalRows,
      success: 0,
      failed: 0,
      progress: 0,
      errors: [],
      downloadUrl: null,
    };
    this.jobs.set(jobId, job);
    this.processJobAsync(jobId);
    return { jobId, status: 'WAITING' };
  }

  getJob(jobId: string): RenderJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private processJobAsync(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';
    const total = job.total;
    let step = 0;

    const timer = setInterval(() => {
      step += Math.max(1, Math.floor(total / 20));
      job.success = Math.min(step, total);
      job.progress = Math.round((job.success / total) * 100);

      if (job.success >= total) {
        clearInterval(timer);
        job.status = 'COMPLETED';
        job.progress = 100;
        job.downloadUrl = `/api/render/jobs/${jobId}/download`;
      }
    }, 500);
  }
}
