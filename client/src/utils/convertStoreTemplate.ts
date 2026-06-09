import type { ITemplate, ITemplatePage, TemplateElement } from '@shared/types/template';
import type { IElementBinding } from '@shared/types/datasource';
import type {
  IStoreTemplateFile,
  IStoreTemplateObject,
  ITemplateStoreEntry,
} from '@shared/types/templateStore';
import { mmToPx, PX_PER_MM } from '@/utils/canvasMetrics';
import { generateBarcodeDataURL, type BarcodeFormat } from '@/utils/barcode';
import { generateQRCodeDataURL } from '@/utils/qrcode';

/** pt 转画布像素（300 DPI） */
function ptToPx(pt: number): number {
  return Math.round((pt / 72) * PX_PER_MM * 25.4);
}

function toPx(value: number, unit: 'mm' | 'px'): number {
  return unit === 'mm' ? mmToPx(value) : Math.round(value);
}

function toBinding(obj: IStoreTemplateObject): IElementBinding | undefined {
  if (!obj.binding?.enabled) return undefined;
  const { fieldCode, fields, template, defaultValue } = obj.binding;
  if (fieldCode) {
    return { enabled: true, type: 'singleField', fieldCode, defaultValue };
  }
  if (fields?.length || template) {
    return { enabled: true, type: 'templateText', fields, template, defaultValue };
  }
  return { enabled: true, type: 'templateText' };
}

function convertTextObject(
  obj: IStoreTemplateObject,
  unit: 'mm' | 'px',
): Record<string, unknown> {
  const style = obj.style ?? {};
  return {
    type: 'i-text',
    version: '5.3.0',
    left: toPx(obj.x, unit),
    top: toPx(obj.y, unit),
    width: obj.width ? toPx(obj.width, unit) : undefined,
    text: obj.content ?? '',
    fontSize: style.fontSize ? ptToPx(style.fontSize) : ptToPx(12),
    fontFamily: style.fontFamily ?? 'SimSun, serif',
    fontWeight: style.fontWeight ?? 'normal',
    fontStyle: style.fontStyle ?? 'normal',
    textAlign: style.textAlign ?? 'left',
    fill: style.color ?? '#333333',
    angle: obj.angle ?? 0,
    editable: true,
    binding: toBinding(obj),
  };
}

function convertRectObject(
  obj: IStoreTemplateObject,
  unit: 'mm' | 'px',
): Record<string, unknown> {
  const style = obj.style ?? {};
  return {
    type: 'rect',
    version: '5.3.0',
    left: toPx(obj.x, unit),
    top: toPx(obj.y, unit),
    width: toPx(obj.width ?? 10, unit),
    height: toPx(obj.height ?? 10, unit),
    fill: style.fill ?? 'transparent',
    stroke: style.stroke ?? '#333333',
    strokeWidth: style.strokeWidth ?? 1,
    angle: obj.angle ?? 0,
  };
}

function convertImageObject(
  obj: IStoreTemplateObject,
  unit: 'mm' | 'px',
  baseUrl: string,
): Record<string, unknown> {
  let src = obj.src ?? '';
  if (src && !src.startsWith('data:') && !src.startsWith('http')) {
    const base = baseUrl.replace(/\/$/, '');
    src = src.startsWith('/')
      ? `${base}${src}`
      : `${base}/${src}`;
  }
  return {
    type: 'image',
    version: '5.3.0',
    left: toPx(obj.x, unit),
    top: toPx(obj.y, unit),
    width: obj.width ? toPx(obj.width, unit) : undefined,
    height: obj.height ? toPx(obj.height, unit) : undefined,
    src,
    angle: obj.angle ?? 0,
  };
}

async function convertBarcodeObject(
  obj: IStoreTemplateObject,
  unit: 'mm' | 'px',
): Promise<Record<string, unknown>> {
  const value = obj.value ?? '{{barcode}}';
  const format = (obj.barcodeType ?? 'CODE128') as BarcodeFormat;
  const targetW = toPx(obj.width ?? 70, unit);
  const targetH = toPx(obj.height ?? 15, unit);

  let dataURL: string;
  try {
    dataURL = generateBarcodeDataURL(value.replace(/\{\{[^}]+\}\}/g, 'SAMPLE'), format);
  } catch {
    dataURL = generateBarcodeDataURL('SAMPLE', 'CODE128');
  }

  const binding = toBinding(obj);
  return {
    type: 'image',
    version: '5.3.0',
    left: toPx(obj.x, unit),
    top: toPx(obj.y, unit),
    src: dataURL,
    scaleX: targetW / 300,
    scaleY: targetH / 80,
    elementType: 'barcode',
    barcodeValue: value,
    barcodeFormat: format,
    binding,
    angle: obj.angle ?? 0,
  };
}

async function convertQrCodeObject(
  obj: IStoreTemplateObject,
  unit: 'mm' | 'px',
): Promise<Record<string, unknown>> {
  const value = obj.value ?? '{{qrcode}}';
  const size = toPx(obj.width ?? 20, unit);
  const sample = value.replace(/\{\{[^}]+\}\}/g, 'SAMPLE');
  const dataURL = await generateQRCodeDataURL(sample, Math.max(size, 80));

  const qrSize = Math.max(size, 80);
  return {
    type: 'image',
    version: '5.3.0',
    left: toPx(obj.x, unit),
    top: toPx(obj.y, unit),
    src: dataURL,
    scaleX: size / qrSize,
    scaleY: size / qrSize,
    elementType: 'qrcode',
    qrValue: value,
    binding: toBinding(obj),
    angle: obj.angle ?? 0,
  };
}

async function convertObject(
  obj: IStoreTemplateObject,
  unit: 'mm' | 'px',
  baseUrl: string,
): Promise<Record<string, unknown>> {
  switch (obj.type) {
    case 'text':
      return convertTextObject(obj, unit);
    case 'rect':
    case 'circle':
      return convertRectObject(obj, unit);
    case 'image':
      return convertImageObject(obj, unit, baseUrl);
    case 'barcode':
      return convertBarcodeObject(obj, unit);
    case 'qrcode':
      return convertQrCodeObject(obj, unit);
    default:
      return convertTextObject({ ...obj, type: 'text', content: obj.content ?? '' }, unit);
  }
}

/** 将 template-store 格式转换为应用内 ITemplate */
export async function convertStoreTemplateToITemplate(
  file: IStoreTemplateFile,
  baseUrl: string,
  entry?: ITemplateStoreEntry,
): Promise<ITemplate> {
  const unit = file.canvas.unit ?? 'mm';
  const pageWidth = toPx(file.canvas.width, unit);
  const pageHeight = toPx(file.canvas.height, unit);

  const objects = await Promise.all(
    file.objects.map((obj) => convertObject(obj, unit, baseUrl)),
  );

  const page: ITemplatePage = {
    width: pageWidth,
    height: pageHeight,
    background: file.canvas.background ?? '#ffffff',
    objects: objects as unknown as TemplateElement[],
  };

  const now = new Date().toISOString();
  return {
    id: entry?.id ?? file.templateId,
    name: file.name ?? entry?.name ?? '未命名模板',
    description: entry?.categoryName,
    pages: [page],
    createdAt: now,
    updatedAt: now,
  };
}
