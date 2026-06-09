import { useCallback, useRef, useState } from 'react';
import { Modal, Input, Select, message } from 'antd';
import {
  FontSizeOutlined,
  PictureOutlined,
  BorderOutlined,
  MinusOutlined,
  QrcodeOutlined,
  BarcodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import { generateQRCodeDataURL } from '@/utils/qrcode';
import { generateBarcodeDataURL, type BarcodeFormat } from '@/utils/barcode';
import './styles.css';

const TriangleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2L14 13H2Z" />
  </svg>
);

const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('{{qr_data}}');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('{{barcode_data}}');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');

  const { canvas, sidebarCollapsed, toggleSidebar, templateSize } = useEditorStore();

  const getCenter = useCallback(() => {
    return { left: templateSize.width / 2, top: templateSize.height / 2 };
  }, [templateSize.width, templateSize.height]);

  const addObj = useCallback((obj: fabric.Object, canvas: fabric.Canvas) => {
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
  }, []);

  const addText = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.IText('双击编辑', {
      left: left - 80, top: top - 15, fontSize: 28,
      fontFamily: 'SimSun, serif', fill: '#333333', editable: true,
    }), canvas);
  }, [canvas, getCenter, addObj]);

  const addPlaceholder = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.IText('{{字段名}}', {
      left: left - 80, top: top - 15, fontSize: 28,
      fontFamily: 'SimSun, serif', fill: '#1677ff', editable: true,
    }), canvas);
  }, [canvas, getCenter, addObj]);

  const addImage = useCallback(() => fileInputRef.current?.click(), []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      const { left, top } = getCenter();
      fabric.Image.fromURL(url, (img) => {
        const scale = Math.min(200 / (img.width || 1), 200 / (img.height || 1), 1);
        img.set({ left: left - (img.width! * scale) / 2, top: top - (img.height! * scale) / 2, scaleX: scale, scaleY: scale });
        addObj(img, canvas!);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [canvas, getCenter, addObj]);

  const addRect = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Rect({
      left: left - 75, top: top - 50, width: 150, height: 100,
      fill: '#e6f4ff', stroke: '#1677ff', strokeWidth: 2, rx: 4, ry: 4,
    }), canvas);
  }, [canvas, getCenter, addObj]);

  const addCircle = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Circle({
      left: left - 50, top: top - 50, radius: 50,
      fill: '#f6ffed', stroke: '#52c41a', strokeWidth: 2,
    }), canvas);
  }, [canvas, getCenter, addObj]);

  const addTriangle = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Triangle({
      left: left - 60, top: top - 50, width: 120, height: 100,
      fill: '#fff7e6', stroke: '#fa8c16', strokeWidth: 2,
    }), canvas);
  }, [canvas, getCenter, addObj]);

  const addLine = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Line([left - 100, top, left + 100, top], {
      stroke: '#333333', strokeWidth: 2,
    }), canvas);
  }, [canvas, getCenter, addObj]);

  const handleAddQR = useCallback(async () => {
    if (!canvas) return;
    const { left, top } = getCenter();
    try {
      const dataURL = await generateQRCodeDataURL(qrValue, 200);
      fabric.Image.fromURL(dataURL, (img) => {
        img.set({ left: left - 50, top: top - 50, scaleX: 0.5, scaleY: 0.5 });
        (img as any).elementType = 'qrcode';
        (img as any).qrValue = qrValue;
        addObj(img, canvas!);
      });
      setQrModalOpen(false);
    } catch { message.error('QR 码生成失败'); }
  }, [canvas, getCenter, qrValue, addObj]);

  const handleAddBarcode = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    try {
      const dataURL = generateBarcodeDataURL(barcodeValue, barcodeFormat);
      fabric.Image.fromURL(dataURL, (img) => {
        const scale = Math.min(150 / (img.width || 1), 60 / (img.height || 1), 1);
        img.set({ left: left - (img.width! * scale) / 2, top: top - (img.height! * scale) / 2, scaleX: scale, scaleY: scale });
        (img as any).elementType = 'barcode';
        (img as any).barcodeValue = barcodeValue;
        addObj(img, canvas!);
      });
      setBarcodeModalOpen(false);
    } catch { message.error('条形码生成失败'); }
  }, [canvas, getCenter, barcodeValue, barcodeFormat, addObj]);

  const collapsed = sidebarCollapsed;

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      <div className="sidebar-tools">
        <button className="tool-item" onClick={addText}>
          <span className="icon"><FontSizeOutlined /></span>
          {!collapsed && <span className="label">文字</span>}
        </button>
        <button className="tool-item" onClick={addPlaceholder}>
          <span className="icon" style={{ fontWeight: 700, fontSize: 12 }}>{'{}'}</span>
          {!collapsed && <span className="label">占位符</span>}
        </button>
        <button className="tool-item" onClick={addImage}>
          <span className="icon"><PictureOutlined /></span>
          {!collapsed && <span className="label">图片</span>}
        </button>

        <div className="divider" />

        <button className="tool-item" onClick={addRect}>
          <span className="icon"><BorderOutlined /></span>
          {!collapsed && <span className="label">矩形</span>}
        </button>
        <button className="tool-item" onClick={addCircle}>
          <span className="icon" style={{ fontSize: 18 }}>○</span>
          {!collapsed && <span className="label">圆形</span>}
        </button>
        <button className="tool-item" onClick={addTriangle}>
          <span className="icon"><TriangleIcon /></span>
          {!collapsed && <span className="label">三角形</span>}
        </button>
        <button className="tool-item" onClick={addLine}>
          <span className="icon"><MinusOutlined /></span>
          {!collapsed && <span className="label">直线</span>}
        </button>

        <div className="divider" />

        <button className="tool-item" onClick={() => setQrModalOpen(true)}>
          <span className="icon"><QrcodeOutlined /></span>
          {!collapsed && <span className="label">二维码</span>}
        </button>
        <button className="tool-item" onClick={() => setBarcodeModalOpen(true)}>
          <span className="icon"><BarcodeOutlined /></span>
          {!collapsed && <span className="label">条形码</span>}
        </button>
      </div>

      <button className="toggle-btn" onClick={toggleSidebar}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>

      <Modal title="添加二维码" open={qrModalOpen} onOk={handleAddQR} onCancel={() => setQrModalOpen(false)} okText="添加" width={400}>
        <div style={{ padding: '12px 0' }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>内容（支持 {'{{占位符}}'}）</label>
          <Input value={qrValue} onChange={(e) => setQrValue(e.target.value)} placeholder="输入 QR 码内容" />
        </div>
      </Modal>

      <Modal title="添加条形码" open={barcodeModalOpen} onOk={handleAddBarcode} onCancel={() => setBarcodeModalOpen(false)} okText="添加" width={400}>
        <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>内容（支持 {'{{占位符}}'}）</label>
            <Input value={barcodeValue} onChange={(e) => setBarcodeValue(e.target.value)} placeholder="输入条码内容" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>格式</label>
            <Select value={barcodeFormat} onChange={setBarcodeFormat} style={{ width: '100%' }} options={[
              { value: 'CODE128', label: 'CODE128' }, { value: 'CODE39', label: 'CODE39' }, { value: 'EAN13', label: 'EAN-13' },
            ]} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Toolbar;
