import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BatchService {
  private jobs: Map<string, any> = new Map();

  async generate(templateId: string, data: any[]) {
    const jobId = uuidv4();
    this.jobs.set(jobId, {
      jobId,
      templateId,
      status: 'pending',
      total: data.length,
      completed: 0,
      resultUrl: null,
    });
    // TODO: implement actual batch generation with worker threads
    return { jobId };
  }

  getStatus(jobId: string) {
    return this.jobs.get(jobId) ?? { error: 'Job not found' };
  }
}
