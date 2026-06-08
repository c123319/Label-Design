import { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

const CanvasEditor: React.FC = () => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);

  const { setCanvas, setActiveObject, templateSize, zoom, pages, currentPageIndex, saveHistory } =
    useEditorStore();

  /** 初始化 Fabric.js 画布 */
  const initCanvas = useCallback(() => {
    if (!canvasElRef.current) return;

    // 销毁旧实例
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

    // 绘制网格
    drawGrid(canvas);

    // 监听选中事件
    canvas.on('selection:created', (e) => {
      setActiveObject(e.selected?.[0] ?? null);
    });
    canvas.on('selection:updated', (e) => {
      setActiveObject(e.selected?.[0] ?? null);
    });
    canvas.on('selection:cleared', () => {
      setActiveObject(null);
    });

    // 对象修改后保存历史
    canvas.on('object:modified', () => {
      saveHistory();
    });
    canvas.on('object:added', () => {
      saveHistory();
    });
    canvas.on('object:removed', () => {
      saveHistory();
    });

    // 鼠标滚轮缩放
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

    // 加载当前页数据
    const page = pages[currentPageIndex];
    if (page && page.objects && page.objects.length > 0) {
      canvas.loadFromJSON({ objects: page.objects, background: page.background || '#ffffff' }, () => {
        canvas.renderAll();
      });
    }

    return canvas;
  }, [templateSize.width, templateSize.height]);

  /** 绘制网格线 */
  function drawGrid(canvas: fabric.Canvas) {
    const gridSize = 50;
    const w = canvas.getWidth();
    const h = canvas.getHeight();

    for (let i = 0; i <= w; i += gridSize) {
      const line = new fabric.Line([i, 0, i, h], {
        stroke: '#e8e8e8',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      (line as any)._isGrid = true;
      canvas.add(line);
      canvas.sendToBack(line);
    }
    for (let i = 0; i <= h; i += gridSize) {
      const line = new fabric.Line([0, i, w, i], {
        stroke: '#e8e8e8',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      (line as any)._isGrid = true;
      canvas.add(line);
      canvas.sendToBack(line);
    }
  }

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

  // 模板尺寸变化时重新初始化
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.setDimensions({
        width: templateSize.width,
        height: templateSize.height,
      });
      canvasRef.current.renderAll();
    }
  }, [templateSize]);

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <div className="canvas-inner" style={{ transform: `translate(-50%, -50%) scale(${zoom})`, transformOrigin: 'center center' }}>
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  );
};

export default CanvasEditor;
