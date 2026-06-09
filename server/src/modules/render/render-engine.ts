import { createCanvas } from 'canvas';
import type { RenderTemplatePage } from '../../types/render-types';
import { fabric } from './utils/fabricLib';
import { initFabricNode, loadFromJSON, getCanvasBuffer } from './utils/fabricNode';
import { applyPreviewToCanvas } from './utils/applyPreview';

export interface RenderPageOptions {
  multiplier?: number;
}

/** 将单页模板 + 行数据渲染为 PNG Buffer */
export async function renderPageToPng(
  page: RenderTemplatePage,
  rowData: Record<string, string | number>,
  options: RenderPageOptions = {},
): Promise<Buffer> {
  initFabricNode();

  const { width, height } = page;
  const background = page.background || '#ffffff';
  const multiplier = options.multiplier ?? 2;

  const el = createCanvas(width, height);
  const canvas = new fabric.StaticCanvas(el, {
    width,
    height,
    backgroundColor: background,
  });

  try {
    await loadFromJSON(canvas, { objects: page.objects as unknown[] });
    await applyPreviewToCanvas(canvas, rowData);
    canvas.renderAll();
    return getCanvasBuffer(el, width, height, multiplier);
  } finally {
    canvas.dispose();
  }
}
