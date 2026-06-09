import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataSourceService } from './data-source.service';

@Controller('api/data-sources')
export class DataSourceController {
  constructor(private readonly dataSourceService: DataSourceService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('templateId') templateId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const source = this.dataSourceService.parseFile(file, templateId);
    return { code: 200, data: source };
  }

  /** 前端已解析数据时，直接提交 JSON */
  @Post('upload-json')
  uploadJson(
    @Body() body: {
      fileName: string;
      rows: Record<string, string | number>[];
      templateId?: string;
    },
  ) {
    if (!body.rows?.length) {
      throw new BadRequestException('rows is required');
    }
    const source = this.dataSourceService.createFromJson(
      body.fileName || 'data.json',
      body.rows,
      body.templateId,
    );
    return { code: 200, data: source };
  }

  @Get(':dataSourceId')
  getOne(@Param('dataSourceId') dataSourceId: string) {
    const source = this.dataSourceService.getById(dataSourceId);
    return { code: 200, data: source };
  }
}
