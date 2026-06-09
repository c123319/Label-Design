import type { IDataField, IBindingValidation } from '@shared/types/datasource';
import type { fabric } from 'fabric';

/** Fabric 对象上的自定义属性 */
export const FABRIC_CUSTOM_PROPS = [
  'elementType',
  'barcodeValue',
  'qrValue',
  'barcodeFormat',
  'binding',
] as const;

export type FabricCustomObject = fabric.Object & {
  elementType?: 'barcode' | 'qrcode';
  barcodeValue?: string;
  qrValue?: string;
  barcodeFormat?: string;
  binding?: import('@shared/types/datasource').IElementBinding;
};

/** 支持中文、英文等任意字段名（除 } 和 | 外） */
const PLACEHOLDER_RE = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;

/** 从数据行中解析字段值，兼容首尾空格 */
export function resolveRowValue(
  rowData: Record<string, string | number | undefined | null>,
  fieldCode: string,
): string | number | undefined | null {
  const trimmed = fieldCode.trim();
  if (trimmed in rowData) return rowData[trimmed];
  for (const [key, val] of Object.entries(rowData)) {
    if (key.trim() === trimmed) return val;
  }
  return undefined;
}

/** 截断展示用文本，避免 UI 撑破布局 */
export function truncateText(text: string, max = 24): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

/** 渲染占位符文本，支持 {{field|默认值}} */
export function renderText(
  template: string,
  rowData: Record<string, string | number | undefined | null>,
): string {
  return template.replace(PLACEHOLDER_RE, (_, rawCode: string, defaultValue?: string) => {
    const value = resolveRowValue(rowData, rawCode);
    if (value === undefined || value === null || value === '') {
      return defaultValue ?? '';
    }
    return String(value);
  });
}

/** 从文本中提取占位符字段编码 */
export function extractPlaceholders(text: string): string[] {
  const fields = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    fields.add(match[1].trim());
  }
  return Array.from(fields);
}

/** 从画布对象收集所有占位符 */
export function collectCanvasPlaceholders(canvas: fabric.Canvas): string[] {
  const fields = new Set<string>();
  canvas.getObjects().forEach((obj) => {
    const custom = obj as FabricCustomObject;
    if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
      extractPlaceholders((obj as fabric.IText).text ?? '').forEach((f) => fields.add(f));
    }
    if (custom.elementType === 'barcode' && custom.barcodeValue) {
      extractPlaceholders(custom.barcodeValue).forEach((f) => fields.add(f));
    }
    if (custom.elementType === 'qrcode' && custom.qrValue) {
      extractPlaceholders(custom.qrValue).forEach((f) => fields.add(f));
    }
  });
  return Array.from(fields);
}

/** 根据表头列名生成字段列表 */
export function buildFieldsFromColumns(
  columns: string[],
  sampleRow?: Record<string, string | number>,
): IDataField[] {
  return columns.map((col) => ({
    fieldCode: col,
    fieldName: col,
    fieldType: 'text' as const,
    sampleValue: sampleRow?.[col] !== undefined ? String(sampleRow[col]) : '',
  }));
}

/** 校验上传数据 */
export function validateUploadData(
  columns: string[],
  rows: Record<string, string | number>[],
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (columns.length === 0) {
    errors.push('表头不能为空，第一行须为字段名');
  }
  if (new Set(columns).size !== columns.length) {
    errors.push('字段名不允许重复');
  }
  if (rows.length === 0) {
    errors.push('至少需要 1 行数据');
  }
  columns.forEach((col) => {
    if (!col || !String(col).trim()) {
      errors.push('存在空的字段名');
    }
    if (/^[=+\-@]/.test(String(col))) {
      warnings.push(`字段 "${col}" 以特殊字符开头，请确认是否为公式注入`);
    }
  });
  rows.slice(0, 10).forEach((row, i) => {
    columns.forEach((col) => {
      const val = row[col];
      if (val !== undefined && typeof val === 'string' && /^[=+\-@]/.test(val)) {
        warnings.push(`第 ${i + 2} 行 "${col}" 列疑似公式内容`);
      }
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

/** 批量生成前校验 */
export function validateBindings(
  canvas: fabric.Canvas,
  fields: IDataField[],
  rows: Record<string, string | number>[],
  maxRows = 5000,
): IBindingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldCodes = new Set(fields.map((f) => f.fieldCode));

  if (rows.length === 0) {
    errors.push('没有数据源，请先上传 Excel 或 CSV');
  }
  if (rows.length > maxRows) {
    errors.push(`数据总量超过限制（最多 ${maxRows} 条）`);
  }

  const placeholders = collectCanvasPlaceholders(canvas);
  placeholders.forEach((ph) => {
    if (!fieldCodes.has(ph)) {
      errors.push(`占位符 {{${ph}}} 在数据源中找不到对应字段`);
    }
  });

  canvas.getObjects().forEach((obj) => {
    const custom = obj as FabricCustomObject;
    if (custom.elementType === 'barcode') {
      const phs = extractPlaceholders(custom.barcodeValue ?? '');
      rows.forEach((row, i) => {
        const value = renderText(custom.barcodeValue ?? '', row);
        if (!value.trim()) {
          warnings.push(`第 ${i + 1} 行：条码内容为空`);
        }
      });
      phs.forEach((ph) => {
        if (!fieldCodes.has(ph)) errors.push(`条码绑定的字段 {{${ph}}} 不存在`);
      });
    }
    if (custom.elementType === 'qrcode') {
      const phs = extractPlaceholders(custom.qrValue ?? '');
      phs.forEach((ph) => {
        if (!fieldCodes.has(ph)) errors.push(`二维码绑定的字段 {{${ph}}} 不存在`);
      });
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/** 获取当前行数据的预览文本 */
export function getPreviewValue(
  template: string,
  rowData: Record<string, string | number> | undefined,
  defaultValue?: string,
): string {
  if (!rowData) return defaultValue ?? template;
  const rendered = renderText(template, rowData);
  return rendered || defaultValue || '';
}

/** 清洗导出文件名，去除非法字符 */
export function sanitizeExportFileName(name: string): string {
  let safe = name.replace(/[\\/:*?"<>|]/g, '_');
  safe = safe.replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^\.+|\.+$/g, '').trim();
  if (!safe) return 'label';
  if (safe.length > 120) safe = safe.slice(0, 120);
  return safe;
}

/** 构建批量导出 PNG 文件名 */
export function buildExportFileName(
  rowIndex: number,
  pageIndex: number,
  pageCount: number,
  prefix: string,
  rowData: Record<string, string | number>,
  fileNameTemplate?: string,
): string {
  const padRow = (n: number) => String(n).padStart(3, '0');

  if (fileNameTemplate?.trim()) {
    const rendered = sanitizeExportFileName(renderText(fileNameTemplate.trim(), rowData));
    if (pageCount === 1) return `${rendered}.png`;
    return `${rendered}_${pageIndex + 1}.png`;
  }
  if (pageCount === 1) return `${prefix}_${padRow(rowIndex + 1)}.png`;
  return `${padRow(rowIndex + 1)}_${pageIndex + 1}.png`;
}
