import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';

@Injectable()
export class UploadService {
  parseDataFile(file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      return JSON.parse(file.buffer.toString('utf-8'));
    }

    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return xlsx.utils.sheet_to_json(sheet);
    }

    throw new Error(`Unsupported file format: ${ext}`);
  }
}
