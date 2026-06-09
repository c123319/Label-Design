import { fabric } from 'fabric';
import { exportTemplateToDataURL } from '@/utils/exportCanvas';
import { applyPreviewToCanvas, clearPreviewCache } from '@/utils/previewRender';
import { restoreTextObjectsEditability } from '@/utils/textEditing';

export interface BatchExportOptions {
  templateSize: { width: number; height: number };
  background: string;
  rows: Record<string, string | number>[];
  fileNamePrefix?: string;
  onProgress?: (current: number, total: number) => void;
}

/** 客户端批量导出：逐行渲染并下载 PNG */
export async function batchExportPng(
  canvas: fabric.Canvas,
  options: BatchExportOptions,
): Promise<{ success: number; failed: number }> {
  const { templateSize, background, rows, fileNamePrefix = 'label', onProgress } = options;
  const snapshot = JSON.stringify(canvas.toJSON());
  let success = 0;
  let failed = 0;

  const activeObj = canvas.getActiveObject();
  canvas.discardActiveObject();

  for (let i = 0; i < rows.length; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        canvas.loadFromJSON(JSON.parse(snapshot), async () => {
          try {
            clearPreviewCache(canvas);
            restoreTextObjectsEditability(canvas);
            await applyPreviewToCanvas(canvas, rows[i]);
            const dataURL = await exportTemplateToDataURL(canvas, templateSize, {
              format: 'png',
              multiplier: 2,
              transparentBackground: false,
              background,
            });
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `${fileNamePrefix}_${i + 1}.png`;
            a.click();
            success++;
            onProgress?.(i + 1, rows.length);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
      // 避免浏览器阻止连续下载
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      failed++;
    }
  }

  await new Promise<void>((resolve) => {
    canvas.loadFromJSON(JSON.parse(snapshot), () => {
      clearPreviewCache(canvas);
      restoreTextObjectsEditability(canvas);
      if (activeObj) canvas.setActiveObject(activeObj);
      canvas.renderAll();
      resolve();
    });
  });

  return { success, failed };
}
