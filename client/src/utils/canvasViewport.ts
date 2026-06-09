import type { fabric } from 'fabric';
import { applyCanvasViewportTransform, getFabricRenderContext } from './canvasMetrics';

export function getCanvasWrapper(canvas: fabric.Canvas): HTMLElement | null {
  return canvas.getElement()?.parentElement?.parentElement ?? null;
}

export function getViewportSize(canvas: fabric.Canvas): { width: number; height: number } {
  const wrapper = getCanvasWrapper(canvas);
  if (wrapper && wrapper.clientWidth > 0 && wrapper.clientHeight > 0) {
    return { width: wrapper.clientWidth, height: wrapper.clientHeight };
  }
  return { width: 800, height: 600 };
}

/** 将模板 fit 到视口并居中 */
export function fitCanvasToContainer(
  canvas: fabric.Canvas,
  templateSize: { width: number; height: number },
) {
  const wrapper = getCanvasWrapper(canvas);
  if (!wrapper) return;

  const cw = wrapper.clientWidth;
  const ch = wrapper.clientHeight;
  const { width: tw, height: th } = templateSize;

  const zoom = Math.min((cw - 40) / tw, (ch - 40) / th, 1);
  const panX = (cw - tw * zoom) / 2;
  const panY = (ch - th * zoom) / 2;

  canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
}

/** 在模板区域内绘制页面背景色 */
export function drawTemplateBackground(
  canvas: fabric.Canvas,
  templateSize: { width: number; height: number },
  background: string,
) {
  const fc = getFabricRenderContext(canvas);
  const ctx = fc.contextContainer;
  const { width, height } = templateSize;

  ctx.save();
  applyCanvasViewportTransform(ctx, canvas);
  ctx.fillStyle = background || '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function resizeCanvasToViewport(canvas: fabric.Canvas): boolean {
  const { width, height } = getViewportSize(canvas);
  if (width <= 0 || height <= 0) return false;
  canvas.setDimensions({ width, height });
  return true;
}
