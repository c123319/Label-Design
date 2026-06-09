import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import ContextMenu from './ContextMenu';
import Ruler from '@/components/Ruler';
import ZoomBar from '@/components/ZoomBar';
import {
  PX_PER_MM,
  applyCanvasViewportTransform,
  getFabricRenderContext,
  getGridIntervalMm,
} from '@/utils/canvasMetrics';
import {
  drawTemplateBackground,
  fitCanvasToContainer,
  resizeCanvasToViewport,
} from '@/utils/canvasViewport';
import { enterTextEditing, isEditableText, restoreTextObjectsEditability } from '@/utils/textEditing';
import './styles.css';

const CanvasEditor: React.FC = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    setCanvas, setActiveObject, setActiveObjects,
    templateSize, pages, currentPageIndex,
    showGrid, saveHistory, canvasTool, canvas,
  } = useEditorStore();

  /** 初始化 Fabric.js 画布 */
  const initCanvas = useCallback(() => {
    if (!canvasElRef.current) return;

    if (canvasRef.current) {
      canvasRef.current.dispose();
    }

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: wrapperRef.current?.clientWidth || 800,
      height: wrapperRef.current?.clientHeight || 600,
      backgroundColor: '',
      selection: true,
      preserveObjectStacking: true,
    });

    // 模板背景：仅填充模板区域，视口其余部分透出灰色工作区
    canvas.on('before:render', (opt: fabric.IEvent & { ctx?: CanvasRenderingContext2D }) => {
      const renderCtx = opt.ctx;
      const fc = getFabricRenderContext(canvas);
      if (!renderCtx || renderCtx !== fc.contextContainer) return;

      const state = useEditorStore.getState();
      const bg = state.pages[state.currentPageIndex]?.background || '#ffffff';
      drawTemplateBackground(canvas, state.templateSize, bg);
    });

    // 动态网格：在 after:render 中用 Canvas 2D API 绘制（与标尺共用 mm 刻度）
    canvas.on('after:render', (opt: fabric.IEvent & { ctx?: CanvasRenderingContext2D }) => {
      if (!useEditorStore.getState().showGrid) return;
      const renderCtx = opt.ctx;
      const fc = getFabricRenderContext(canvas);
      if (!renderCtx || renderCtx !== fc.contextContainer) return;

      const { templateSize: size } = useEditorStore.getState();
      const ctx = fc.contextContainer;
      const canvasWidth = size.width;
      const canvasHeight = size.height;
      const gridStepMm = getGridIntervalMm(canvas.getZoom());
      const maxMmX = canvasWidth / PX_PER_MM;
      const maxMmY = canvasHeight / PX_PER_MM;

      ctx.save();
      const zoom = applyCanvasViewportTransform(ctx, canvas);
      const retina = fc.getRetinaScaling();

      ctx.strokeStyle = 'rgba(230, 232, 235, 0.6)';
      ctx.lineWidth = 1 / (zoom * retina);
      ctx.beginPath();

      for (let mm = 0; mm <= maxMmX + 0.001; mm += gridStepMm) {
        const x = mm * PX_PER_MM;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let mm = 0; mm <= maxMmY + 0.001; mm += gridStepMm) {
        const y = mm * PX_PER_MM;
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

    canvas.on('mouse:dblclick', (opt) => {
      const target = opt.target;
      if (!isEditableText(target)) return;
      enterTextEditing(target, opt.e);
    });

    canvas.on('text:editing:exited', () => saveHistory());

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

    // 拖拽平移（拖拽工具 或 Alt + 拖拽）
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    const applyCanvasTool = (tool: 'select' | 'pan') => {
      if (tool === 'pan') {
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      } else {
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      }
    };

    applyCanvasTool(useEditorStore.getState().canvasTool);

    canvas.on('mouse:down', (opt) => {
      const tool = useEditorStore.getState().canvasTool;
      if (tool === 'pan' || opt.e.altKey) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
        canvas.defaultCursor = 'grabbing';
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
      if (!isPanning) return;
      isPanning = false;
      const tool = useEditorStore.getState().canvasTool;
      canvas.defaultCursor = tool === 'pan' ? 'grab' : 'default';
      canvas.selection = tool === 'select';
    });

    canvasRef.current = canvas;
    setCanvas(canvas);

    resizeCanvasToViewport(canvas);
    canvas.calcOffset();

    const afterLoad = () => {
      restoreTextObjectsEditability(canvas);
      canvas.calcOffset();
      fitCanvasToContainer(canvas, templateSize);
      useEditorStore.setState({ zoom: canvas.getZoom() });
    };

    // 加载当前页数据，加载完成后 fit to container
    const page = pages[currentPageIndex];
    if (page && page.objects && page.objects.length > 0) {
      canvas.loadFromJSON({ objects: page.objects }, () => {
        canvas.setBackgroundColor('', () => {});
        afterLoad();
      });
    } else {
      afterLoad();
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

  // 视口尺寸变化时同步 canvas 大小
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !canvas) return;

    const onResize = () => {
      if (!canvasRef.current) return;
      if (resizeCanvasToViewport(canvasRef.current)) {
        canvasRef.current.calcOffset();
        fitCanvasToContainer(canvasRef.current, useEditorStore.getState().templateSize);
        useEditorStore.setState({ zoom: canvasRef.current.getZoom() });
        canvasRef.current.requestRenderAll();
      }
    };

    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(wrapper);
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [canvas, templateSize.width, templateSize.height]);

  // 模板尺寸变化时重新 fit
  useEffect(() => {
    if (canvasRef.current) {
      fitCanvasToContainer(canvasRef.current, templateSize);
      useEditorStore.setState({ zoom: canvasRef.current.getZoom() });
      canvasRef.current.requestRenderAll();
    }
  }, [templateSize]);

  // 切换选中 / 拖拽工具
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvasTool === 'pan') {
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
    } else {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
    }
  }, [canvasTool]);

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
        <div className="canvas-wrapper" ref={wrapperRef}>
          <canvas ref={canvasElRef} />
        </div>
        <div className="canvas-zoom-overlay">
          <ZoomBar />
        </div>
      </div>
    </ContextMenu>
  );
};

export default CanvasEditor;
