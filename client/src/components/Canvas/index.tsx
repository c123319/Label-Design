import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import ContextMenu from './ContextMenu';
import Ruler from '@/components/Ruler';
import './styles.css';

/** 根据缩放级别自适应网格间距（px） */
function getAdaptiveGridSize(zoom: number): number {
  const PX_PER_MM = 300 / 25.4;
  const candidates = [PX_PER_MM * 1, PX_PER_MM * 2, PX_PER_MM * 5, PX_PER_MM * 10, PX_PER_MM * 20, PX_PER_MM * 50];
  for (const size of candidates) {
    if (size * zoom >= 40) return size;
  }
  return PX_PER_MM * 100;
}

/** 计算初始 fit zoom 并居中画布内容 */
function fitCanvasToContainer(canvas: fabric.Canvas) {
  const el = canvas.getElement();
  const container = el?.parentElement?.parentElement;
  if (!container) return;

  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const tw = canvas.getWidth();
  const th = canvas.getHeight();

  const zoom = Math.min((cw - 40) / tw, (ch - 40) / th, 1);
  const panX = (cw - tw * zoom) / 2;
  const panY = (ch - th * zoom) / 2;

  canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
  useEditorStore.setState({ zoom });
}

const CanvasEditor: React.FC = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);

  const {
    setCanvas, setActiveObject, setActiveObjects,
    templateSize, pages, currentPageIndex,
    showGrid, saveHistory,
  } = useEditorStore();

  /** 初始化 Fabric.js 画布 */
  const initCanvas = useCallback(() => {
    if (!canvasElRef.current) return;

    if (canvasRef.current) {
      canvasRef.current.dispose();
    }

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: templateSize.width,
      height: templateSize.height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // 动态网格：在 after:render 中用 Canvas 2D API 绘制
    canvas.on('after:render', () => {
      if (!useEditorStore.getState().showGrid) return;

      const ctx = canvas.getContext();
      const vpt = canvas.viewportTransform;
      if (!vpt) return;

      const fabricZoom = vpt[0];
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      const gridSize = getAdaptiveGridSize(fabricZoom);

      ctx.save();
      ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1 / fabricZoom;
      ctx.beginPath();

      for (let x = 0; x <= canvasWidth; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let y = 0; y <= canvasHeight; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
      }

      ctx.stroke();
      ctx.restore();
    });

    // 监听选中事件 — 支持多选
    canvas.on('selection:created', (e) => {
      setActiveObject(e.selected?.[0] ?? null);
      setActiveObjects(e.selected ?? []);
    });
    canvas.on('selection:updated', (e) => {
      setActiveObject(e.selected?.[0] ?? null);
      setActiveObjects(e.selected ?? []);
    });
    canvas.on('selection:cleared', () => {
      setActiveObject(null);
      setActiveObjects([]);
    });

    // 对象修改后保存历史
    canvas.on('object:modified', () => saveHistory());
    canvas.on('object:added', () => saveHistory());
    canvas.on('object:removed', () => saveHistory());

    // 鼠标滚轮缩放 — 仅用 Fabric.js viewportTransform，无 CSS 变换
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      newZoom = Math.min(Math.max(0.1, newZoom), 5);
      canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), newZoom);
      useEditorStore.setState({ zoom: newZoom });
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // 鼠标位置追踪（标尺用）
    canvas.on('mouse:move', (opt) => {
      useEditorStore.getState().setMousePosition({
        x: opt.e.clientX,
        y: opt.e.clientY,
      });
    });
    canvas.on('mouse:out', () => {
      useEditorStore.getState().setMousePosition(null);
    });

    // Alt + 拖拽平移
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt) => {
      if (opt.e.altKey) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
        canvas.defaultCursor = 'grab';
      }
    });
    canvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const vpt = canvas.viewportTransform!;
        vpt[4] += opt.e.clientX - lastPosX;
        vpt[5] += opt.e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
      }
    });
    canvas.on('mouse:up', () => {
      isPanning = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
    });

    canvasRef.current = canvas;
    setCanvas(canvas);

    // 加载当前页数据，加载完成后 fit to container
    const page = pages[currentPageIndex];
    if (page && page.objects && page.objects.length > 0) {
      canvas.loadFromJSON({ objects: page.objects, background: page.background || '#ffffff' }, () => {
        fitCanvasToContainer(canvas);
      });
    } else {
      fitCanvasToContainer(canvas);
    }

    return canvas;
  }, [templateSize.width, templateSize.height]);

  // 初始化画布
  useEffect(() => {
    const canvas = initCanvas();
    return () => {
      if (canvas) {
        canvas.dispose();
        canvasRef.current = null;
        setCanvas(null);
      }
    };
  }, [initCanvas]);

  // 模板尺寸变化时重新设置并重新 fit
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setDimensions({
        width: templateSize.width,
        height: templateSize.height,
      });
      fitCanvasToContainer(canvasRef.current);
    }
  }, [templateSize]);

  // 网格可见性变化 → 触发重绘
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.requestRenderAll();
    }
  }, [showGrid]);

  return (
    <ContextMenu>
      <div className="canvas-container">
        <Ruler />
        <div className="canvas-wrapper">
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </ContextMenu>
  );
};

export default CanvasEditor;
