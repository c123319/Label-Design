import JSZip from 'jszip';
import { fabric } from 'fabric';
import type { ITemplatePage } from '@shared/types/template';
import { exportTemplateToDataURL } from '@/utils/exportCanvas';
import { applyPreviewToCanvas, clearPreviewCache } from '@/utils/previewRender';
import { restoreTextObjectsEditability } from '@/utils/textEditing';
import { canvasToJSON } from '@/utils/fabricCustomProps';
import { buildExportFileName } from '@/utils/renderTemplate';

export interface BatchExportOptions {
  pages: ITemplatePage[];
  rows: Record<string, string | number>[];
  fileNamePrefix?: string;
  /** 支持 {{字段名}} 占位符，如 {{productName}}_标签 */
  fileNameTemplate?: string;
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

export interface BatchExportResult {
  success: number;
  failed: number;
  cancelled: boolean;
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

function ensureUniqueName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0;
  used.set(name, count + 1);
  if (count === 0) return name;
  const stem = name.replace(/\.png$/, '');
  return `${stem}_${count + 1}.png`;
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

async function restoreCanvas(
  canvas: fabric.Canvas,
  snapshot: string,
  activeObj: fabric.Object | undefined,
): Promise<void> {
  return new Promise((resolve) => {
    canvas.loadFromJSON(JSON.parse(snapshot), () => {
      clearPreviewCache(canvas);
      restoreTextObjectsEditability(canvas);
      if (activeObj) canvas.setActiveObject(activeObj);
      canvas.renderAll();
      resolve();
    });
  });
}

/** 客户端批量导出：逐行逐页渲染，打包为单个 ZIP 下载 */
export async function batchExportZip(
  canvas: fabric.Canvas,
  options: BatchExportOptions,
): Promise<BatchExportResult> {
  const {
    pages,
    rows,
    fileNamePrefix = 'label',
    fileNameTemplate,
    onProgress,
    signal,
  } = options;
  const snapshot = JSON.stringify(canvasToJSON(canvas));
  const activeObj = canvas.getActiveObject();
  canvas.discardActiveObject();

  const zip = new JSZip();
  const total = rows.length * pages.length;
  let success = 0;
  let failed = 0;
  let progress = 0;
  let cancelled = false;
  const usedNames = new Map<string, number>();

  try {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        if (signal?.aborted) {
          cancelled = true;
          break;
        }

        const page = pages[pageIndex];
        const templateSize = { width: page.width, height: page.height };
        const background = page.background || '#ffffff';
        const baseName = buildExportFileName(
          rowIndex,
          pageIndex,
          pages.length,
          fileNamePrefix,
          rows[rowIndex],
          fileNameTemplate,
        );
        const fileName = ensureUniqueName(baseName, usedNames);

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

      if (cancelled) break;
    }

    if (!cancelled && success > 0) {
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${fileNamePrefix}.zip`);
    }
  } finally {
    await restoreCanvas(canvas, snapshot, activeObj ?? undefined);
  }

  return { success, failed, cancelled };
}

/** @deprecated 使用 batchExportZip */
export const batchExportPng = batchExportZip;
