import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('data')
  @UseInterceptors(FileInterceptor('file'))
  uploadData(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.uploadService.parseDataFile(file);
  }
}
