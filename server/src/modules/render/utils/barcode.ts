import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13';

/** 生成条形码 PNG Buffer */
export function generateBarcodeBuffer(
  value: string,
  format: BarcodeFormat = 'CODE128',
  width = 2,
  height = 80,
): Buffer {
  const canvas = createCanvas(200, height);
  const opts = {
    format: format.toLowerCase() as 'code128' | 'code39' | 'ean13',
    width,
    height,
    displayValue: false,
    margin: 0,
    background: '#ffffff',
  };
  try {
    JsBarcode(canvas, value, opts);
  } catch {
    JsBarcode(canvas, value, { ...opts, format: 'code128' });
  }
  return canvas.toBuffer('image/png');
}
