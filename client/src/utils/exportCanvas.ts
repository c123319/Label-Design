import { fabric } from 'fabric';

export interface ExportTemplateOptions {
  format: 'png' | 'jpeg';
  multiplier: number;
  /** 为 true 时不填充页面背景色（仅 PNG 有效） */
  transparentBackground: boolean;
  background: string;
  quality?: number;
}

/** 按模板尺寸导出画布，默认包含页面背景色 */
export function exportTemplateToDataURL(
  canvas: fabric.Canvas,
  templateSize: { width: number; height: number },
  options: ExportTemplateOptions,
): Promise<string> {
  const { width, height } = templateSize;
  const { format, multiplier, transparentBackground, background } = options;
  const useBackground = format === 'jpeg' || !transparentBackground;

  return new Promise((resolve, reject) => {
    const el = document.createElement('canvas');
    const exportCanvas = new fabric.StaticCanvas(el, {
      width,
      height,
      backgroundColor: useBackground ? (background || '#ffffff') : '',
    });

    exportCanvas.loadFromJSON(canvas.toJSON(), () => {
      exportCanvas.renderAll();
      try {
        const dataURL = exportCanvas.toDataURL({
          format,
          quality: options.quality ?? (format === 'jpeg' ? 0.92 : 1),
          multiplier,
          width,
          height,
        });
        exportCanvas.dispose();
        resolve(dataURL);
      } catch (err) {
        exportCanvas.dispose();
        reject(err);
      }
    });
  });
}
