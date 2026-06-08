import QRCode from 'qrcode';

/** 生成 QR 码 data URL */
export async function generateQRCodeDataURL(value: string, size = 200): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
