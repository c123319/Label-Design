import { useCallback, useRef, useState } from 'react';
import { Tooltip, Modal, Input, Select, message } from 'antd';
import {
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  MinusOutlined,
  QrcodeOutlined,
  BarcodeOutlined,
  CopyOutlined,
  SnippetsOutlined,
  AppstoreOutlined,
  GroupOutlined,
  UngroupOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import { generateQRCodeDataURL } from '@/utils/qrcode';
import { generateBarcodeDataURL, type BarcodeFormat } from '@/utils/barcode';
import './styles.css';

/** 三角形 SVG 图标 */
const TriangleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2L14 13H2Z" />
  </svg>
);

/** 垂直居中对齐图标 */
const AlignVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="3" width="14" height="1.5" />
    <rect x="5" y="6.5" width="6" height="6" rx="0.5" />
    <rect x="1" y="13.5" width="14" height="1.5" />
  </svg>
);

/** 水平居中对齐图标 */
const AlignHorizontalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="2" y="1" width="1.5" height="14" />
    <rect x="5.5" y="5" width="6" height="6" rx="0.5" />
    <rect x="12.5" y="1" width="1.5" height="14" />
  </svg>
);

const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('{{qr_data}}');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('{{barcode_data}}');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');

  const {
    canvas, activeObject, activeObjects, undo, redo,
    copySelected, pasteObject, duplicateSelected, deleteSelected,
    groupSelected, ungroupSelected, showGrid, toggleGrid,
  } = useEditorStore();

  const getCenter = useCallback(() => {
    if (!canvas) return { left: 200, top: 150 };
    return { left: canvas.getWidth() / 2, top: canvas.getHeight() / 2 };
  }, [canvas]);

  // ── 元素添加 ──

  const addText = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const text = new fabric.IText('双击编辑', {
      left: left - 80, top: top - 15, fontSize: 28,
      fontFamily: 'SimSun, serif', fill: '#333333', editable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas, getCenter]);

  const addPlaceholderText = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const text = new fabric.IText('{{字段名}}', {
      left: left - 80, top: top - 15, fontSize: 28,
      fontFamily: 'SimSun, serif', fill: '#1677ff', editable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [canvas, getCenter]);

  const addImage = useCallback(() => fileInputRef.current?.click(), []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const { left, top } = getCenter();
      fabric.Image.fromURL(url, (img) => {
        const maxDim = 200;
        const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1), 1);
        img.set({
          left: left - (img.width! * scale) / 2,
          top: top - (img.height! * scale) / 2,
          scaleX: scale, scaleY: scale,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [canvas, getCenter]);

  const addRect = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const rect = new fabric.Rect({
      left: left - 75, top: top - 50, width: 150, height: 100,
      fill: '#e6f4ff', stroke: '#1677ff', strokeWidth: 2, rx: 4, ry: 4,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  }, [canvas, getCenter]);

  const addCircle = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const circle = new fabric.Circle({
      left: left - 50, top: top - 50, radius: 50,
      fill: '#f6ffed', stroke: '#52c41a', strokeWidth: 2,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  }, [canvas, getCenter]);

  const addTriangle = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const tri = new fabric.Triangle({
      left: left - 60, top: top - 50, width: 120, height: 100,
      fill: '#fff7e6', stroke: '#fa8c16', strokeWidth: 2,
    });
    canvas.add(tri);
    canvas.setActiveObject(tri);
    canvas.renderAll();
  }, [canvas, getCenter]);

  const addLine = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const line = new fabric.Line([left - 100, top, left + 100, top], {
      stroke: '#333333', strokeWidth: 2,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  }, [canvas, getCenter]);

  // ── QR 码（真实渲染） ──

  const handleAddQR = useCallback(async () => {
    if (!canvas) return;
    const { left, top } = getCenter();
    try {
      const dataURL = await generateQRCodeDataURL(qrValue, 200);
      fabric.Image.fromURL(dataURL, (img) => {
        img.set({ left: left - 50, top: top - 50, scaleX: 0.5, scaleY: 0.5 });
        (img as any).elementType = 'qrcode';
        (img as any).qrValue = qrValue;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
      setQrModalOpen(false);
      message.success('QR 码已添加');
    } catch {
      message.error('QR 码生成失败');
    }
  }, [canvas, getCenter, qrValue]);

  // ── 条形码（真实渲染） ──

  const handleAddBarcode = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    try {
      const dataURL = generateBarcodeDataURL(barcodeValue, barcodeFormat);
      fabric.Image.fromURL(dataURL, (img) => {
        const scale = Math.min(150 / (img.width || 1), 60 / (img.height || 1), 1);
        img.set({
          left: left - (img.width! * scale) / 2,
          top: top - (img.height! * scale) / 2,
          scaleX: scale, scaleY: scale,
        });
        (img as any).elementType = 'barcode';
        (img as any).barcodeValue = barcodeValue;
        (img as any).barcodeFormat = barcodeFormat;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
      setBarcodeModalOpen(false);
      message.success('条形码已添加');
    } catch {
      message.error('条形码生成失败');
    }
  }, [canvas, getCenter, barcodeValue, barcodeFormat]);

  // ── 对齐工具 ──

  const getActiveSelection = useCallback(() => {
    if (!canvas) return null;
    const active = canvas.getActiveObject();
    if (active?.type === 'activeSelection') return active as fabric.ActiveSelection;
    return null;
  }, [canvas]);

  const alignLeft = useCallback(() => {
    const sel = getActiveSelection();
    if (!sel) return;
    const minLeft = Math.min(...sel.getObjects().map((o) => o.left || 0));
    sel.getObjects().forEach((o) => o.set('left', minLeft));
    canvas!.discardActiveObject();
    sel.getObjects().forEach((o) => canvas!.setActiveObject(o));
    canvas!.renderAll();
  }, [getActiveSelection, canvas]);

  const alignRight = useCallback(() => {
    const sel = getActiveSelection();
    if (!sel) return;
    const maxRight = Math.max(...sel.getObjects().map((o) => (o.left || 0) + (o.getScaledWidth?.() || 0)));
    sel.getObjects().forEach((o) => o.set('left', maxRight - (o.getScaledWidth?.() || 0)));
    canvas!.discardActiveObject();
    sel.getObjects().forEach((o) => canvas!.setActiveObject(o));
    canvas!.renderAll();
  }, [getActiveSelection, canvas]);

  const alignTop = useCallback(() => {
    const sel = getActiveSelection();
    if (!sel) return;
    const minTop = Math.min(...sel.getObjects().map((o) => o.top || 0));
    sel.getObjects().forEach((o) => o.set('top', minTop));
    canvas!.discardActiveObject();
    sel.getObjects().forEach((o) => canvas!.setActiveObject(o));
    canvas!.renderAll();
  }, [getActiveSelection, canvas]);

  const alignBottom = useCallback(() => {
    const sel = getActiveSelection();
    if (!sel) return;
    const maxBottom = Math.max(...sel.getObjects().map((o) => (o.top || 0) + (o.getScaledHeight?.() || 0)));
    sel.getObjects().forEach((o) => o.set('top', maxBottom - (o.getScaledHeight?.() || 0)));
    canvas!.discardActiveObject();
    sel.getObjects().forEach((o) => canvas!.setActiveObject(o));
    canvas!.renderAll();
  }, [getActiveSelection, canvas]);

  const alignCenterH = useCallback(() => {
    const sel = getActiveSelection();
    if (!sel) return;
    const centers = sel.getObjects().map((o) => (o.left || 0) + (o.getScaledWidth?.() || 0) / 2);
    const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
    sel.getObjects().forEach((o) => o.set('left', avg - (o.getScaledWidth?.() || 0) / 2));
    canvas!.discardActiveObject();
    sel.getObjects().forEach((o) => canvas!.setActiveObject(o));
    canvas!.renderAll();
  }, [getActiveSelection, canvas]);

  const alignCenterV = useCallback(() => {
    const sel = getActiveSelection();
    if (!sel) return;
    const centers = sel.getObjects().map((o) => (o.top || 0) + (o.getScaledHeight?.() || 0) / 2);
    const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
    sel.getObjects().forEach((o) => o.set('top', avg - (o.getScaledHeight?.() || 0) / 2));
    canvas!.discardActiveObject();
    sel.getObjects().forEach((o) => canvas!.setActiveObject(o));
    canvas!.renderAll();
  }, [getActiveSelection, canvas]);

  const hasMultipleSelection = activeObjects.length > 1;

  return (
    <div className="toolbar">
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      {/* ── 元素工具 ── */}
      <Tooltip title="文字" placement="right"><button className="tool-btn" onClick={addText}><FontSizeOutlined /></button></Tooltip>
      <Tooltip title="占位符 {{}}" placement="right"><button className="tool-btn" onClick={addPlaceholderText}><span style={{ fontSize: 12, fontWeight: 700 }}>{'{}'}</span></button></Tooltip>
      <Tooltip title="图片" placement="right"><button className="tool-btn" onClick={addImage}><PictureOutlined /></button></Tooltip>

      <div className="divider" />

      <Tooltip title="矩形" placement="right"><button className="tool-btn" onClick={addRect}><BorderOutlined /></button></Tooltip>
      <Tooltip title="圆形" placement="right"><button className="tool-btn" onClick={addCircle}><span style={{ fontSize: 18 }}>○</span></button></Tooltip>
      <Tooltip title="三角形" placement="right"><button className="tool-btn" onClick={addTriangle}><TriangleIcon /></button></Tooltip>
      <Tooltip title="直线" placement="right"><button className="tool-btn" onClick={addLine}><MinusOutlined /></button></Tooltip>

      <div className="divider" />

      <Tooltip title="二维码" placement="right"><button className="tool-btn" onClick={() => setQrModalOpen(true)}><QrcodeOutlined /></button></Tooltip>
      <Tooltip title="条形码" placement="right"><button className="tool-btn" onClick={() => setBarcodeModalOpen(true)}><BarcodeOutlined /></button></Tooltip>

      <div className="divider" />

      {/* ── 编辑操作 ── */}
      <Tooltip title="复制 (Ctrl+C)" placement="right"><button className="tool-btn" onClick={copySelected} disabled={!activeObject}><CopyOutlined /></button></Tooltip>
      <Tooltip title="粘贴 (Ctrl+V)" placement="right"><button className="tool-btn" onClick={pasteObject}><SnippetsOutlined /></button></Tooltip>
      <Tooltip title="删除 (Delete)" placement="right"><button className="tool-btn danger" onClick={deleteSelected} disabled={!activeObject}><DeleteOutlined /></button></Tooltip>

      <div className="divider" />

      {/* ── 组合 / 网格 ── */}
      <Tooltip title="组合 (Ctrl+G)" placement="right"><button className="tool-btn" onClick={groupSelected} disabled={!hasMultipleSelection}><GroupOutlined /></button></Tooltip>
      <Tooltip title="取消组合" placement="right"><button className="tool-btn" onClick={ungroupSelected} disabled={activeObject?.type !== 'group'}><UngroupOutlined /></button></Tooltip>
      <Tooltip title={showGrid ? '隐藏网格' : '显示网格'} placement="right"><button className={showGrid ? 'tool-btn active' : 'tool-btn'} onClick={() => toggleGrid()}><AppstoreOutlined /></button></Tooltip>

      <div className="divider" />

      {/* ── 对齐工具（多选时启用） ── */}
      <Tooltip title="左对齐" placement="right"><button className="tool-btn" onClick={alignLeft} disabled={!hasMultipleSelection}><AlignLeftOutlined /></button></Tooltip>
      <Tooltip title="右对齐" placement="right"><button className="tool-btn" onClick={alignRight} disabled={!hasMultipleSelection}><AlignRightOutlined /></button></Tooltip>
      <Tooltip title="上对齐" placement="right"><button className="tool-btn" onClick={alignTop} disabled={!hasMultipleSelection}><VerticalAlignTopOutlined /></button></Tooltip>
      <Tooltip title="下对齐" placement="right"><button className="tool-btn" onClick={alignBottom} disabled={!hasMultipleSelection}><VerticalAlignBottomOutlined /></button></Tooltip>
      <Tooltip title="水平居中" placement="right"><button className="tool-btn" onClick={alignCenterH} disabled={!hasMultipleSelection}><AlignCenterOutlined /></button></Tooltip>
      <Tooltip title="垂直居中" placement="right"><button className="tool-btn" onClick={alignCenterV} disabled={!hasMultipleSelection}><AlignVerticalIcon /></button></Tooltip>

      <div className="divider" />

      {/* ── 撤销/重做 ── */}
      <Tooltip title="撤销 (Ctrl+Z)" placement="right"><button className="tool-btn" onClick={undo}><UndoOutlined /></button></Tooltip>
      <Tooltip title="重做 (Ctrl+Y)" placement="right"><button className="tool-btn" onClick={redo}><RedoOutlined /></button></Tooltip>

      {/* ── QR 码弹窗 ── */}
      <Modal title="添加二维码" open={qrModalOpen} onOk={handleAddQR} onCancel={() => setQrModalOpen(false)} okText="添加" width={400}>
        <div style={{ padding: '12px 0' }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>内容（支持 {'{{占位符}}'}）</label>
          <Input value={qrValue} onChange={(e) => setQrValue(e.target.value)} placeholder="输入 QR 码内容" />
        </div>
      </Modal>

      {/* ── 条形码弹窗 ── */}
      <Modal title="添加条形码" open={barcodeModalOpen} onOk={handleAddBarcode} onCancel={() => setBarcodeModalOpen(false)} okText="添加" width={400}>
        <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>内容（支持 {'{{占位符}}'}）</label>
            <Input value={barcodeValue} onChange={(e) => setBarcodeValue(e.target.value)} placeholder="输入条码内容" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>格式</label>
            <Select value={barcodeFormat} onChange={setBarcodeFormat} style={{ width: '100%' }} options={[
              { value: 'CODE128', label: 'CODE128' },
              { value: 'CODE39', label: 'CODE39' },
              { value: 'EAN13', label: 'EAN-13' },
            ]} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Toolbar;
