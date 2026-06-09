import QRCode from 'qrcode';

/** 生成 QR 码 PNG Buffer */
export async function generateQRCodeBuffer(value: string, size = 200): Promise<Buffer> {
  return QRCode.toBuffer(value, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
    type: 'png',
  });
}
