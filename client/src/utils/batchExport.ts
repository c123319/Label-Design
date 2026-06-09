import JSZip from 'jszip';
import { fabric } from 'fabric';
import type { ITemplatePage } from '@shared/types/template';
import { exportTemplateToDataURL } from '@/utils/exportCanvas';
import { applyPreviewToCanvas, clearPreviewCache } from '@/utils/previewRender';
import { restoreTextObjectsEditability } from '@/utils/textEditing';
import { canvasToJSON } from '@/utils/fabricCustomProps';

export interface BatchExportOptions {
  pages: ITemplatePage[];
  rows: Record<string, string | number>[];
  fileNamePrefix?: string;
  onProgress?: (current: number, total: number) => void;
}

function padRow(n: number): string {
  return String(n).padStart(3, '0');
}

function buildFileName(
  rowIndex: number,
  pageIndex: number,
  pageCount: number,
  prefix: string,
): string {
  if (pageCount === 1) {
    return `${prefix}_${padRow(rowIndex + 1)}.png`;
  }
  return `${padRow(rowIndex + 1)}_${pageIndex + 1}.png`;
}

function dataURLToUint8Array(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function loadPageIntoCanvas(
  canvas: fabric.Canvas,
  page: ITemplatePage,
): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.loadFromJSON(
      { objects: page.objects },
      () => {
        clearPreviewCache(canvas);
        restoreTextObjectsEditability(canvas);
        canvas.renderAll();
        resolve();
      },
      reject,
    );
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** 客户端批量导出：逐行逐页渲染，打包为单个 ZIP 下载 */
export async function batchExportZip(
  canvas: fabric.Canvas,
  options: BatchExportOptions,
): Promise<{ success: number; failed: number }> {
  const { pages, rows, fileNamePrefix = 'label', onProgress } = options;
  const snapshot = JSON.stringify(canvasToJSON(canvas));
  const activeObj = canvas.getActiveObject();
  canvas.discardActiveObject();

  const zip = new JSZip();
  const total = rows.length * pages.length;
  let success = 0;
  let failed = 0;
  let progress = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const templateSize = { width: page.width, height: page.height };
      const background = page.background || '#ffffff';
      const fileName = buildFileName(rowIndex, pageIndex, pages.length, fileNamePrefix);

      try {
        await loadPageIntoCanvas(canvas, page);
        await applyPreviewToCanvas(canvas, rows[rowIndex]);
        const dataURL = await exportTemplateToDataURL(canvas, templateSize, {
          format: 'png',
          multiplier: 2,
          transparentBackground: false,
          background,
        });
        zip.file(fileName, dataURLToUint8Array(dataURL), { binary: true });
        success++;
      } catch {
        failed++;
      }

      progress++;
      onProgress?.(progress, total);
    }
  }

  if (success > 0) {
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${fileNamePrefix}.zip`);
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

/** @deprecated 使用 batchExportZip */
export const batchExportPng = batchExportZip;
