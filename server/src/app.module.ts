import { Module } from '@nestjs/common';
import { TemplateModule } from './modules/template/template.module';
import { BatchModule } from './modules/batch/batch.module';
import { UploadModule } from './modules/upload/upload.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [TemplateModule, BatchModule, UploadModule, ExportModule],
})
export class AppModule {}
