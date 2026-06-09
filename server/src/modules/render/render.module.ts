import { Module } from '@nestjs/common';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { DataSourceModule } from '../data-source/data-source.module';
import { TemplateModule } from '../template/template.module';

@Module({
  imports: [DataSourceModule, TemplateModule],
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
