import type { fabric } from 'fabric';

/** 300 DPI 下每毫米对应的画布像素 */
export const PX_PER_MM = 300 / 25.4;

/** 标尺宽度 (px) */
export const RULER_SIZE = 28;

type FabricRenderCanvas = fabric.Canvas & {
  contextContainer: CanvasRenderingContext2D;
  getRetinaScaling: () => number;
};

/** 根据缩放级别确定合适的刻度间距（mm） */
export function getTickInterval(visualZoom: number): { major: number; minor: number } {
  const pixelsPerMajor = PX_PER_MM * visualZoom;
  const intervals = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
  let major = 10;
  for (const iv of intervals) {
    if (iv * pixelsPerMajor >= 50) {
      major = iv;
      break;
    }
  }
  const minor = major / 5;
  return { major, minor };
}

/** 网格间距（mm），与标尺次刻度一致 */
export function getGridIntervalMm(visualZoom: number): number {
  return getTickInterval(visualZoom).minor;
}

/** 在 Fabric after:render 中设置画布坐标系（含 Retina 缩放） */
export function applyCanvasViewportTransform(
  ctx: CanvasRenderingContext2D,
  canvas: fabric.Canvas,
): number {
  const fc = canvas as FabricRenderCanvas;
  const vpt = fc.viewportTransform!;
  const retina = fc.getRetinaScaling();
  ctx.setTransform(
    vpt[0] * retina,
    vpt[1] * retina,
    vpt[2] * retina,
    vpt[3] * retina,
    vpt[4] * retina,
    vpt[5] * retina,
  );
  return vpt[0];
}

export function getFabricRenderContext(canvas: fabric.Canvas): FabricRenderCanvas {
  return canvas as FabricRenderCanvas;
}
