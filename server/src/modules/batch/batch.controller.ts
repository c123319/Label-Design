import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { BatchService } from './batch.service';

@Controller('api/batch')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post('generate')
  generate(@Body() body: { templateId: string; data: any[] }) {
    return this.batchService.generate(body.templateId, body.data);
  }

  @Get('status/:jobId')
  getStatus(@Param('jobId') jobId: string) {
    return this.batchService.getStatus(jobId);
  }
}
