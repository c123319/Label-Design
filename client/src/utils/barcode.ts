import JsBarcode from 'jsbarcode';

/** 条形码格式 */
export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13';

/** 生成条形码 data URL */
export function generateBarcodeDataURL(
  value: string,
  format: BarcodeFormat = 'CODE128',
  width = 2,
  height = 80,
): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: format.toLowerCase() as 'code128' | 'code39' | 'ean13',
      width,
      height,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
    });
  } catch {
    // 如果值不匹配格式，回退到 CODE128
    JsBarcode(canvas, value, {
      format: 'code128',
      width,
      height,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
    });
  }
  return canvas.toDataURL('image/png');
}
