import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TemplateModule } from './modules/template/template.module';
import { UploadModule } from './modules/upload/upload.module';
import { ExportModule } from './modules/export/export.module';
import { DataSourceModule } from './modules/data-source/data-source.module';
import { RenderModule } from './modules/render/render.module';
import { StoreModule } from './modules/store/store.module';

@Module({
  imports: [
    PrismaModule,
    TemplateModule,
    UploadModule,
    ExportModule,
    DataSourceModule,
    RenderModule,
    StoreModule,
  ],
})
export class AppModule {}
