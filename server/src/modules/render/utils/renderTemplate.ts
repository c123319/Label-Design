/** 占位符渲染（与 client 端 renderTemplate.ts 保持一致） */

const PLACEHOLDER_RE = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;

export const FABRIC_CUSTOM_PROPS = [
  'elementType',
  'barcodeValue',
  'qrValue',
  'barcodeFormat',
  'binding',
] as const;

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

export function sanitizeExportFileName(name: string): string {
  let safe = name.replace(/[\\/:*?"<>|]/g, '_');
  safe = safe.replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^\.+|\.+$/g, '').trim();
  if (!safe) return 'label';
  if (safe.length > 120) safe = safe.slice(0, 120);
  return safe;
}

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

function ensureUniqueName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0;
  used.set(name, count + 1);
  if (count === 0) return name;
  const stem = name.replace(/\.png$/, '');
  return `${stem}_${count + 1}.png`;
}

export function uniqueExportFileName(
  rowIndex: number,
  pageIndex: number,
  pageCount: number,
  prefix: string,
  rowData: Record<string, string | number>,
  used: Map<string, number>,
  fileNameTemplate?: string,
): string {
  const base = buildExportFileName(
    rowIndex,
    pageIndex,
    pageCount,
    prefix,
    rowData,
    fileNameTemplate,
  );
  return ensureUniqueName(base, used);
}
