import { fabric } from 'fabric';
import { canvasToJSON } from '@/utils/fabricCustomProps';

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

    const json = canvasToJSON(canvas);
    // 编辑画布背景由 before:render 绘制，序列化 JSON 中 background 为空，loadFromJSON 会覆盖导出背景
    json.background = useBackground ? (background || '#ffffff') : '';

    exportCanvas.loadFromJSON(json, () => {
      exportCanvas.renderAll();
      // 等待图片元素（条码/二维码）完成加载后再导出
      const finalize = () => {
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
      };
      requestAnimationFrame(() => requestAnimationFrame(finalize));
    });
  });
}
