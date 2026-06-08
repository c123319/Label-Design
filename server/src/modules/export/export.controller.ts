import { Controller, Post, Body } from '@nestjs/common';
import { ExportService } from './export.service';

@Controller('api/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('pdf')
  exportPdf(@Body() body: { templateId: string }) {
    return this.exportService.exportPdf(body.templateId);
  }

  @Post('images')
  exportImages(@Body() body: { templateId: string }) {
    return this.exportService.exportImages(body.templateId);
  }
}
