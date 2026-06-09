import { Module } from '@nestjs/common';
import { TemplateModule } from './modules/template/template.module';
import { BatchModule } from './modules/batch/batch.module';
import { UploadModule } from './modules/upload/upload.module';
import { ExportModule } from './modules/export/export.module';
import { DataSourceModule } from './modules/data-source/data-source.module';
import { RenderModule } from './modules/render/render.module';

@Module({
  imports: [
    TemplateModule,
    BatchModule,
    UploadModule,
    ExportModule,
    DataSourceModule,
    RenderModule,
  ],
})
export class AppModule {}
