import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { RenderService } from './render.service';

@Controller('api/render')
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  @Post('jobs')
  createJob(
    @Body()
    body: {
      templateId: string;
      dataSourceId: string;
      outputType?: string;
      range?: { type: string };
      options?: Record<string, unknown>;
    },
  ) {
    const result = this.renderService.createJob(body);
    return { code: 200, data: result };
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string) {
    const job = this.renderService.getJob(jobId);
    return { code: 200, data: job };
  }
}
