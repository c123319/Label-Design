import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';
import type { RenderTemplate } from '../../types/render-types';
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
      range?: { type: string; from?: number; to?: number };
      options?: {
        fileNamePrefix?: string;
        fileNameTemplate?: string;
        multiplier?: number;
      };
      templateSnapshot?: RenderTemplate;
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

  @Get('jobs/:jobId/download')
  async downloadJob(@Param('jobId') jobId: string, @Res() res: Response) {
    try {
      const { zipPath, fileName } = await this.renderService.getJobZipPath(jobId);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      createReadStream(zipPath).pipe(res);
    } catch {
      throw new NotFoundException('Download not available');
    }
  }
}
