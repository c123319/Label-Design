import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';

export interface StoredDataSource {
  id: string;
  templateId?: string;
  fileName: string;
  fileType: string;
  fields: { fieldCode: string; fieldName: string; fieldType: string; sampleValue?: string }[];
  previewRows: Record<string, string | number>[];
  totalRows: number;
  rows: Record<string, string | number>[];
  createdAt: string;
}

@Injectable()
export class DataSourceService {
  private sources = new Map<string, StoredDataSource>();

  parseFile(file: Express.Multer.File, templateId?: string): StoredDataSource {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    let rows: Record<string, string | number>[] = [];

    if (ext === 'json') {
      rows = JSON.parse(file.buffer.toString('utf-8'));
    } else if (['csv', 'xlsx', 'xls'].includes(ext)) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet) as Record<string, string | number>[];
    } else {
      throw new Error(`Unsupported format: ${ext}`);
    }

    return this.createFromRows(rows, file.originalname, ext, templateId);
  }

  createFromJson(
    fileName: string,
    rows: Record<string, string | number>[],
    templateId?: string,
  ): StoredDataSource {
    return this.createFromRows(rows, fileName, 'json', templateId);
  }

  private createFromRows(
    rows: Record<string, string | number>[],
    fileName: string,
    fileType: string,
    templateId?: string,
  ): StoredDataSource {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const fields = columns.map((col) => ({
      fieldCode: col,
      fieldName: col,
      fieldType: 'text',
      sampleValue: rows[0]?.[col] !== undefined ? String(rows[0][col]) : '',
    }));

    const id = `ds_${uuidv4().slice(0, 8)}`;
    const source: StoredDataSource = {
      id,
      templateId,
      fileName,
      fileType,
      fields,
      previewRows: rows.slice(0, 10),
      totalRows: rows.length,
      rows,
      createdAt: new Date().toISOString(),
    };
    this.sources.set(id, source);
    return source;
  }

  getById(id: string): StoredDataSource {
    const source = this.sources.get(id);
    if (!source) throw new NotFoundException('Data source not found');
    return source;
  }
}
