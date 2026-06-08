import { useCallback, useRef } from 'react';
import { Tooltip } from 'antd';
import {
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  MinusOutlined,
  QrcodeOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canvas, activeObject, undo, redo } = useEditorStore();

  /** 获取画布中心坐标 */
  const getCenter = useCallback(() => {
    if (!canvas) return { left: 200, top: 150 };
    return {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
    };
  }, [canvas]);

  /** 添加文字 */
  const addText = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const text = new fabric.IText('双击编辑', {
      left: left - 80,
      top: top - 15,
      fontSize: 28,
      fontFamily: 'SimSun, serif',
      fill: '#333333',
      editable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 添加占位符文字 */
  const addPlaceholderText = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const text = new fabric.IText('{{字段名}}', {
      left: left - 80,
      top: top - 15,
      fontSize: 28,
      fontFamily: 'SimSun, serif',
      fill: '#1677ff',
      editable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 添加图片 */
  const addImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canvas || !e.target.files?.length) return;
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const { left, top } = getCenter();
        fabric.Image.fromURL(url, (img) => {
          // 等比缩放到合理大小
          const maxDim = 200;
          const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1), 1);
          img.set({
            left: left - (img.width! * scale) / 2,
            top: top - (img.height! * scale) / 2,
            scaleX: scale,
            scaleY: scale,
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [canvas, getCenter],
  );

  /** 添加矩形 */
  const addRect = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const rect = new fabric.Rect({
      left: left - 75,
      top: top - 50,
      width: 150,
      height: 100,
      fill: '#e6f4ff',
      stroke: '#1677ff',
      strokeWidth: 2,
      rx: 4,
      ry: 4,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 添加圆形 */
  const addCircle = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const circle = new fabric.Circle({
      left: left - 50,
      top: top - 50,
      radius: 50,
      fill: '#f6ffed',
      stroke: '#52c41a',
      strokeWidth: 2,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 添加直线 */
  const addLine = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const line = new fabric.Line([left - 100, top, left + 100, top], {
      stroke: '#333333',
      strokeWidth: 2,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 添加二维码占位 */
  const addQrCode = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    // 用矩形作为 QR 码占位符，后续可替换为实际渲染
    const qrPlaceholder = new fabric.Rect({
      left: left - 40,
      top: top - 40,
      width: 80,
      height: 80,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 1,
    });
    // 添加 QR 文字标记
    const qrLabel = new fabric.IText('QR', {
      left: left - 12,
      top: top - 14,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      selectable: false,
      evented: false,
    });
    const group = new fabric.Group([qrPlaceholder, qrLabel], {
      left: left - 40,
      top: top - 40,
    });
    (group as any).elementType = 'qrcode';
    (group as any).qrValue = '{{qr_data}}';
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 添加条形码占位 */
  const addBarcode = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    // 用条纹矩形作为条形码占位符
    const items: fabric.Object[] = [];
    const barWidth = 3;
    const barGap = 2;
    for (let i = 0; i < 30; i++) {
      if (i % 2 === 0) {
        const bar = new fabric.Rect({
          width: barWidth,
          height: 50,
          fill: '#000000',
          left: i * (barWidth + barGap),
          top: 0,
        });
        items.push(bar);
      }
    }
    const group = new fabric.Group(items, {
      left: left - 50,
      top: top - 25,
    });
    (group as any).elementType = 'barcode';
    (group as any).barcodeValue = '{{barcode_data}}';
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas, getCenter]);

  /** 删除选中元素 */
  const deleteSelected = useCallback(() => {
    if (!canvas || !activeObject) return;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas, activeObject]);

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      <Tooltip title="文字" placement="right">
        <button className="tool-btn" onClick={addText}>
          <FontSizeOutlined />
        </button>
      </Tooltip>

      <Tooltip title="占位符文字 {{}}" placement="right">
        <button className="tool-btn" onClick={addPlaceholderText}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{'{}'}</span>
        </button>
      </Tooltip>

      <Tooltip title="图片" placement="right">
        <button className="tool-btn" onClick={addImage}>
          <PictureOutlined />
        </button>
      </Tooltip>

      <div className="divider" />

      <Tooltip title="矩形" placement="right">
        <button className="tool-btn" onClick={addRect}>
          <BorderOutlined />
        </button>
      </Tooltip>

      <Tooltip title="圆形" placement="right">
        <button className="tool-btn" onClick={addCircle}>
          <span style={{ fontSize: 18 }}>○</span>
        </button>
      </Tooltip>

      <Tooltip title="直线" placement="right">
        <button className="tool-btn" onClick={addLine}>
          <MinusOutlined />
        </button>
      </Tooltip>

      <div className="divider" />

      <Tooltip title="二维码" placement="right">
        <button className="tool-btn" onClick={addQrCode}>
          <QrcodeOutlined />
        </button>
      </Tooltip>

      <Tooltip title="条形码" placement="right">
        <button className="tool-btn" onClick={addBarcode}>
          <ScissorOutlined />
        </button>
      </Tooltip>

      <div className="divider" />

      <Tooltip title="删除 (Delete)" placement="right">
        <button className="tool-btn danger" onClick={deleteSelected} disabled={!activeObject}>
          <DeleteOutlined />
        </button>
      </Tooltip>

      <div className="divider" />

      <Tooltip title="撤销 (Ctrl+Z)" placement="right">
        <button className="tool-btn" onClick={undo}>
          <UndoOutlined />
        </button>
      </Tooltip>

      <Tooltip title="重做 (Ctrl+Y)" placement="right">
        <button className="tool-btn" onClick={redo}>
          <RedoOutlined />
        </button>
      </Tooltip>
    </div>
  );
};

export default Toolbar;
