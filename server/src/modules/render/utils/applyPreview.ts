import { fabric } from './fabricLib';
import { renderText } from './renderTemplate';
import { generateBarcodeBuffer, type BarcodeFormat } from './barcode';
import { generateQRCodeBuffer } from './qrcode';
import { replaceImageFromBuffer, type FabricCustomObject } from './fabricNode';

/** 将单行数据渲染到 Fabric 画布 */
export async function applyPreviewToCanvas(
  canvas: fabric.StaticCanvas,
  rowData: Record<string, string | number>,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  canvas.getObjects().forEach((obj: fabric.Object) => {
    const custom = obj as FabricCustomObject;

    if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
      const textObj = obj as fabric.IText;
      const template = textObj.text ?? '';
      textObj.set('text', renderText(template, rowData));
    }

    if (custom.elementType === 'barcode' && custom.barcodeValue) {
      const value = renderText(custom.barcodeValue, rowData);
      const buffer = generateBarcodeBuffer(
        value || 'PLACEHOLDER',
        (custom.barcodeFormat as BarcodeFormat) || 'CODE128',
      );
      tasks.push(replaceImageFromBuffer(obj as fabric.Image, buffer));
    }

    if (custom.elementType === 'qrcode' && custom.qrValue) {
      const value = renderText(custom.qrValue, rowData);
      tasks.push(
        generateQRCodeBuffer(value || 'PLACEHOLDER', 200).then((buffer) =>
          replaceImageFromBuffer(obj as fabric.Image, buffer),
        ),
      );
    }
  });

  await Promise.all(tasks);
  canvas.renderAll();
}
