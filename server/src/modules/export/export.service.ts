import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  async exportPdf(templateId: string) {
    // TODO: implement PDF export using node-canvas + pdfkit
    return { message: `PDF export for template ${templateId} - not yet implemented` };
  }

  async exportImages(templateId: string) {
    // TODO: implement image export using node-canvas
    return { message: `Image export for template ${templateId} - not yet implemented` };
  }
}
