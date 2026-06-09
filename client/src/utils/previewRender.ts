import { fabric } from 'fabric';
import { generateBarcodeDataURL, type BarcodeFormat } from '@/utils/barcode';
import { generateQRCodeDataURL } from '@/utils/qrcode';
import { renderText, type FabricCustomObject } from '@/utils/renderTemplate';

function setImageFromDataURL(img: fabric.Image, dataURL: string): Promise<void> {
  return new Promise((resolve) => {
    fabric.Image.fromURL(dataURL, (newImg) => {
      img.setElement(newImg.getElement() as HTMLImageElement);
      img.set({ width: newImg.width, height: newImg.height });
      // 同步 src，确保 toJSON / 导出时使用最新图片
      (img as fabric.Image & { src?: string }).src = dataURL;
      resolve();
    });
  });
}

/** 将单行数据渲染到画布（不修改快照，基于当前对象状态） */
export async function applyPreviewToCanvas(
  canvas: fabric.Canvas,
  rowData: Record<string, string | number>,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  canvas.getObjects().forEach((obj) => {
    const custom = obj as FabricCustomObject;

    if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
      const textObj = obj as fabric.IText;
      const template = (textObj as fabric.IText & { _originalText?: string })._originalText
        ?? textObj.text
        ?? '';
      if (!(textObj as fabric.IText & { _originalText?: string })._originalText) {
        (textObj as fabric.IText & { _originalText?: string })._originalText = template;
      }
      textObj.set('text', renderText(template, rowData));
    }

    if (custom.elementType === 'barcode' && custom.barcodeValue) {
      const img = obj as fabric.Image;
      const template = (img as fabric.Image & { _originalBarcodeValue?: string })._originalBarcodeValue
        ?? custom.barcodeValue;
      if (!(img as fabric.Image & { _originalBarcodeValue?: string })._originalBarcodeValue) {
        (img as fabric.Image & { _originalBarcodeValue?: string })._originalBarcodeValue = template;
      }
      const value = renderText(template, rowData);
      try {
        const dataURL = generateBarcodeDataURL(
          value || 'PLACEHOLDER',
          (custom.barcodeFormat as BarcodeFormat) || 'CODE128',
        );
        tasks.push(setImageFromDataURL(img, dataURL));
      } catch { /* keep current image */ }
    }

    if (custom.elementType === 'qrcode' && custom.qrValue) {
      const img = obj as fabric.Image;
      const template = (img as fabric.Image & { _originalQrValue?: string })._originalQrValue
        ?? custom.qrValue;
      if (!(img as fabric.Image & { _originalQrValue?: string })._originalQrValue) {
        (img as fabric.Image & { _originalQrValue?: string })._originalQrValue = template;
      }
      const value = renderText(template, rowData);
      tasks.push(
        generateQRCodeDataURL(value || 'PLACEHOLDER', 200).then((dataURL) =>
          setImageFromDataURL(img, dataURL),
        ),
      );
    }
  });

  await Promise.all(tasks);
  canvas.renderAll();
}

/** 清除预览时写入的 _original* 缓存 */
export function clearPreviewCache(canvas: fabric.Canvas): void {
  canvas.getObjects().forEach((obj) => {
    const textObj = obj as fabric.IText & { _originalText?: string };
    if (textObj._originalText !== undefined) delete textObj._originalText;
    const barcodeImg = obj as fabric.Image & { _originalBarcodeValue?: string };
    if (barcodeImg._originalBarcodeValue !== undefined) delete barcodeImg._originalBarcodeValue;
    const qrImg = obj as fabric.Image & { _originalQrValue?: string };
    if (qrImg._originalQrValue !== undefined) delete qrImg._originalQrValue;
  });
}
