import { Module } from '@nestjs/common';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { DataSourceModule } from '../data-source/data-source.module';

@Module({
  imports: [DataSourceModule],
  controllers: [RenderController],
  providers: [RenderService],
})
export class RenderModule {}
