import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';

export interface StoredDataSource {
  id: string;
  templateId?: string;
  fileName: string;
  fileType: string;
  fields: {
    fieldCode: string;
    fieldName: string;
    fieldType: string;
    sampleValue?: string;
  }[];
  previewRows: Record<string, string | number>[];
  totalRows: number;
  rows: Record<string, string | number>[];
  createdAt: string;
}

function buildFields(rows: Record<string, string | number>[]) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return columns.map((col) => ({
    fieldCode: col,
    fieldName: col,
    fieldType: 'text',
    sampleValue:
      rows[0]?.[col] !== undefined ? String(rows[0][col]) : '',
  }));
}

function toStoredDataSource(record: any): StoredDataSource {
  return {
    id: record.id,
    templateId: record.templateId ?? undefined,
    fileName: record.fileName,
    fileType: record.fileType,
    fields: JSON.parse(record.fieldsJson ?? '[]'),
    previewRows: JSON.parse(record.previewJson ?? '[]'),
    totalRows: record.totalRows,
    rows: JSON.parse(record.rowsJson ?? '[]'),
    createdAt: record.createdAt,
  };
}

@Injectable()
export class DataSourceService {
  constructor(private readonly prisma: PrismaService) {}

  async parseFile(
    file: Express.Multer.File,
    templateId?: string,
  ): Promise<StoredDataSource> {
    const ext =
      file.originalname.split('.').pop()?.toLowerCase() ?? '';
    let rows: Record<string, string | number>[] = [];

    if (ext === 'json') {
      rows = JSON.parse(file.buffer.toString('utf-8'));
    } else if (['csv', 'xlsx', 'xls'].includes(ext)) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet) as Record<
        string,
        string | number
      >[];
    } else {
      throw new Error(`Unsupported format: ${ext}`);
    }

    return this.createFromRows(rows, file.originalname, ext, templateId);
  }

  async createFromJson(
    fileName: string,
    rows: Record<string, string | number>[],
    templateId?: string,
  ): Promise<StoredDataSource> {
    return this.createFromRows(rows, fileName, 'json', templateId);
  }

  private async createFromRows(
    rows: Record<string, string | number>[],
    fileName: string,
    fileType: string,
    templateId?: string,
  ): Promise<StoredDataSource> {
    const fields = buildFields(rows);
    const id = `ds_${uuidv4().slice(0, 8)}`;
    const previewRows = rows.slice(0, 10);

    const record = await this.prisma.dataSource.create({
      data: {
        id,
        fileName,
        fileType,
        fieldsJson: JSON.stringify(fields),
        previewJson: JSON.stringify(previewRows),
        totalRows: rows.length,
        rowsJson: JSON.stringify(rows),
      },
    });

    const stored = toStoredDataSource(record);
    // 入库后回填 templateId 关联（可选）
    if (templateId) {
      await this.prisma.template
        .update({
          where: { id: templateId },
          data: { dataSourceId: id },
        })
        .catch(() => {
          /* 模板可能尚未入库，忽略关联失败 */
        });
      stored.templateId = templateId;
    }
    return stored;
  }

  async getById(id: string): Promise<StoredDataSource> {
    const record = await this.prisma.dataSource.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Data source not found');
    return toStoredDataSource(record);
  }
}
