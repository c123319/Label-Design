import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import { PX_PER_MM, RULER_SIZE, getTickInterval } from '@/utils/canvasMetrics';
import './styles.css';
const HIGHLIGHT_COLOR = 'rgba(82, 196, 26, 0.35)';
const HIGHLIGHT_BORDER_COLOR = 'rgba(82, 196, 26, 0.7)';
const CURSOR_COLOR = 'rgba(22, 119, 255, 0.6)';
const TICK_COLOR = '#999';
const TICK_COLOR_MAJOR = '#555';
const LABEL_COLOR = '#666';
const BG_COLOR = '#f5f5f5';

/** 浮点安全的倍数判定：避免 mm % major 因浮点漂移返回接近 major 而非 0 */
function isNearMultiple(value: number, interval: number, tolerance = 0.01): boolean {
  return Math.abs(value - Math.round(value / interval) * interval) < tolerance;
}

/** 格式化刻度数字：major ≥ 1 显示整数，否则保留一位小数 */
function formatTickLabel(mm: number, major: number): string {
  if (major >= 1) return String(Math.round(mm));
  return String(parseFloat(mm.toFixed(1)));
}

/** 获取选中元素的包围盒（画布坐标 px） */
function getSelectionBounds(activeObjects: fabric.Object[]): {
  left: number; top: number; right: number; bottom: number;
} | null {
  if (activeObjects.length === 0) return null;

  if (activeObjects.length === 1) {
    const obj = activeObjects[0];
    const left = obj.left ?? 0;
    const top = obj.top ?? 0;
    return {
      left,
      top,
      right: left + obj.getScaledWidth(),
      bottom: top + obj.getScaledHeight(),
    };
  }

  // 多选：计算包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of activeObjects) {
    const l = obj.left ?? 0;
    const t = obj.top ?? 0;
    const r = l + obj.getScaledWidth();
    const b = t + obj.getScaledHeight();
    if (l < minX) minX = l;
    if (t < minY) minY = t;
    if (r > maxX) maxX = r;
    if (b > maxY) maxY = b;
  }
  return { left: minX, top: minY, right: maxX, bottom: maxY };
}

/**
 * 计算画布坐标 → 标尺像素位置的映射参数
 * 返回 { scale, offset } 使得: rulerPos = canvasCoord * scale + offset
 *
 * 统一坐标换算：仅依赖 Fabric.js viewportTransform，不使用 CSS transform。
 * canvasCoord → canvas内部像素: canvasPixel = canvasCoord * fabricZoom + fabricPan
 * canvas内部像素 → 屏幕位置:    screenPos = canvasRectOrigin + canvasPixel  (cssScale = 1)
 * 屏幕位置 → 标尺位置:          rulerPos = screenPos - containerOrigin - RULER_SIZE
 */
function getCanvasToRulerMapping(
  vpt: number[],
  canvasEl: HTMLCanvasElement,
  containerEl: HTMLElement,
  axis: 'x' | 'y',
) {
  const canvasRect = canvasEl.getBoundingClientRect();
  const containerRect = containerEl.getBoundingClientRect();

  const fabricZoom = axis === 'x' ? vpt[0] : vpt[3];
  const fabricPan = axis === 'x' ? vpt[4] : vpt[5];
  const canvasVisualOrigin = axis === 'x' ? canvasRect.left : canvasRect.top;
  const containerOrigin = axis === 'x' ? containerRect.left : containerRect.top;

  const scale = fabricZoom;
  const offset = canvasVisualOrigin + fabricPan - containerOrigin - RULER_SIZE;

  return { scale, offset };
}

/** 画水平标尺 */
function drawHorizontalRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  vpt: number[],
  canvasEl: HTMLCanvasElement,
  containerEl: HTMLElement,
  bounds: { left: number; right: number } | null,
  mouseClientX: number | null,
  containerRect: DOMRect,
) {
  const { scale, offset } = getCanvasToRulerMapping(vpt, canvasEl, containerEl, 'x');

  // 清空
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, RULER_SIZE);

  // 可见范围（mm）
  const visStartMm = (-offset / scale) / PX_PER_MM;
  const visEndMm = ((width - offset) / scale) / PX_PER_MM;

  const { major, minor } = getTickInterval(scale);

  // 画刻度
  const startTick = Math.floor(visStartMm / minor) * minor;
  const endTick = Math.ceil(visEndMm / minor) * minor;

  for (let mm = startTick; mm <= endTick; mm += minor) {
    const canvasPx = mm * PX_PER_MM;
    const screenPx = canvasPx * scale + offset;
    if (screenPx < -1 || screenPx > width + 1) continue;

    const isMajor = isNearMultiple(mm, major);
    const isMid = !isMajor && isNearMultiple(mm, major / 2);

    ctx.beginPath();
    ctx.strokeStyle = isMajor ? TICK_COLOR_MAJOR : TICK_COLOR;
    ctx.lineWidth = isMajor ? 1 : 0.5;

    if (isMajor) {
      ctx.moveTo(screenPx, RULER_SIZE);
      ctx.lineTo(screenPx, 4);
    } else if (isMid) {
      ctx.moveTo(screenPx, RULER_SIZE);
      ctx.lineTo(screenPx, 10);
    } else {
      ctx.moveTo(screenPx, RULER_SIZE);
      ctx.lineTo(screenPx, 16);
    }
    ctx.stroke();

    // 主刻度数字
    if (isMajor) {
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatTickLabel(mm, major), screenPx, 12);
    }
  }

  // 元素高亮
  if (bounds) {
    const x1 = Math.max(0, bounds.left * scale + offset);
    const x2 = Math.min(width, bounds.right * scale + offset);
    if (x2 > x1) {
      ctx.fillStyle = HIGHLIGHT_COLOR;
      ctx.fillRect(x1, 0, x2 - x1, RULER_SIZE);
      ctx.strokeStyle = HIGHLIGHT_BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, 0, x2 - x1, RULER_SIZE);
    }
  }

  // 鼠标指示线（mouseClientX 是 clientX）
  if (mouseClientX !== null) {
    const mx = mouseClientX - containerRect.left - RULER_SIZE;
    if (mx >= 0 && mx <= width) {
      ctx.beginPath();
      ctx.strokeStyle = CURSOR_COLOR;
      ctx.lineWidth = 1;
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, RULER_SIZE);
      ctx.stroke();
    }
  }
}

/** 画垂直标尺 */
function drawVerticalRuler(
  ctx: CanvasRenderingContext2D,
  height: number,
  vpt: number[],
  canvasEl: HTMLCanvasElement,
  containerEl: HTMLElement,
  bounds: { top: number; bottom: number } | null,
  mouseClientY: number | null,
  containerRect: DOMRect,
) {
  const { scale, offset } = getCanvasToRulerMapping(vpt, canvasEl, containerEl, 'y');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, RULER_SIZE, height);

  const visStartMm = (-offset / scale) / PX_PER_MM;
  const visEndMm = ((height - offset) / scale) / PX_PER_MM;

  const { major, minor } = getTickInterval(scale);

  const startTick = Math.floor(visStartMm / minor) * minor;
  const endTick = Math.ceil(visEndMm / minor) * minor;

  for (let mm = startTick; mm <= endTick; mm += minor) {
    const canvasPx = mm * PX_PER_MM;
    const screenPx = canvasPx * scale + offset;
    if (screenPx < -1 || screenPx > height + 1) continue;

    const isMajor = isNearMultiple(mm, major);
    const isMid = !isMajor && isNearMultiple(mm, major / 2);

    ctx.beginPath();
    ctx.strokeStyle = isMajor ? TICK_COLOR_MAJOR : TICK_COLOR;
    ctx.lineWidth = isMajor ? 1 : 0.5;

    if (isMajor) {
      ctx.moveTo(RULER_SIZE, screenPx);
      ctx.lineTo(4, screenPx);
    } else if (isMid) {
      ctx.moveTo(RULER_SIZE, screenPx);
      ctx.lineTo(10, screenPx);
    } else {
      ctx.moveTo(RULER_SIZE, screenPx);
      ctx.lineTo(16, screenPx);
    }
    ctx.stroke();

    // 主刻度数字（垂直标尺文字旋转）
    if (isMajor) {
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(10, screenPx);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(formatTickLabel(mm, major), 0, 0);
      ctx.restore();
    }
  }

  // 元素高亮
  if (bounds) {
    const y1 = Math.max(0, bounds.top * scale + offset);
    const y2 = Math.min(height, bounds.bottom * scale + offset);
    if (y2 > y1) {
      ctx.fillStyle = HIGHLIGHT_COLOR;
      ctx.fillRect(0, y1, RULER_SIZE, y2 - y1);
      ctx.strokeStyle = HIGHLIGHT_BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y1, RULER_SIZE, y2 - y1);
    }
  }

  // 鼠标指示线
  if (mouseClientY !== null) {
    const my = mouseClientY - containerRect.top - RULER_SIZE;
    if (my >= 0 && my <= height) {
      ctx.beginPath();
      ctx.strokeStyle = CURSOR_COLOR;
      ctx.lineWidth = 1;
      ctx.moveTo(0, my);
      ctx.lineTo(RULER_SIZE, my);
      ctx.stroke();
    }
  }
}

const Ruler: React.FC = () => {
  const canvas = useEditorStore((s) => s.canvas);
  const activeObjects = useEditorStore((s) => s.activeObjects);
  const mousePosition = useEditorStore((s) => s.mousePosition);

  const containerRef = useRef<HTMLDivElement>(null);
  const hCanvasRef = useRef<HTMLCanvasElement>(null);
  const vCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  /** 绘制标尺（用 rAF 节流） */
  const draw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!canvas || !containerRef.current) return;
      const fabricCanvas = canvas as fabric.Canvas;
      const canvasEl = fabricCanvas.getElement();
      const container = containerRef.current.parentElement;
      if (!canvasEl || !container) return;

      const vpt = fabricCanvas.viewportTransform;
      if (!vpt) return;

      const containerRect = container.getBoundingClientRect();
      const bounds = getSelectionBounds(activeObjects);

      // 水平标尺
      const hCanvas = hCanvasRef.current;
      if (hCanvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = hCanvas.parentElement?.clientWidth ?? 0;
        hCanvas.width = w * dpr;
        hCanvas.height = RULER_SIZE * dpr;
        hCanvas.style.width = `${w}px`;
        hCanvas.style.height = `${RULER_SIZE}px`;
        const ctx = hCanvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          drawHorizontalRuler(
            ctx, w, vpt, canvasEl, container,
            bounds ? { left: bounds.left, right: bounds.right } : null,
            mousePosition?.x ?? null,
            containerRect,
          );
        }
      }

      // 垂直标尺
      const vCanvas = vCanvasRef.current;
      if (vCanvas) {
        const dpr = window.devicePixelRatio || 1;
        const h = vCanvas.parentElement?.clientHeight ?? 0;
        vCanvas.width = RULER_SIZE * dpr;
        vCanvas.height = h * dpr;
        vCanvas.style.width = `${RULER_SIZE}px`;
        vCanvas.style.height = `${h}px`;
        const ctx = vCanvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          drawVerticalRuler(
            ctx, h, vpt, canvasEl, container,
            bounds ? { top: bounds.top, bottom: bounds.bottom } : null,
            mousePosition?.y ?? null,
            containerRect,
          );
        }
      }
    });
  }, [canvas, activeObjects, mousePosition]);

  // 监听画布事件，触发重绘
  useEffect(() => {
    if (!canvas) return;

    const events = [
      'object:moving', 'object:scaling', 'object:modified', 'object:rotating',
      'selection:created', 'selection:updated', 'selection:cleared',
      'after:render',
    ];

    const handler = () => draw();
    events.forEach((e) => canvas.on(e, handler));

    // 缩放/平移后也要刷新
    const origZoomToPoint = canvas.zoomToPoint.bind(canvas);
    canvas.zoomToPoint = function (point: fabric.Point, value: number) {
      origZoomToPoint(point, value);
      draw();
      return canvas;
    };

    return () => {
      events.forEach((e) => canvas.off(e, handler));
      canvas.zoomToPoint = origZoomToPoint;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvas, draw]);

  // activeObjects 或 mousePosition 变化时重绘
  useEffect(() => {
    draw();
  }, [draw]);

  // 窗口 resize 时重绘
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return (
    <div className="ruler-overlay" ref={containerRef}>
      <div className="ruler-corner" />
      <canvas ref={hCanvasRef} className="ruler-horizontal" />
      <canvas ref={vCanvasRef} className="ruler-vertical" />
    </div>
  );
};

export default Ruler;
