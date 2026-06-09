import { useCallback, useRef } from 'react';
import { message } from 'antd';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import { generateQRCodeDataURL } from '@/utils/qrcode';
import { generateBarcodeDataURL, type BarcodeFormat } from '@/utils/barcode';
import { focusTextForEdit } from '@/utils/textEditing';

export function useCanvasActions() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canvas, templateSize } = useEditorStore();

  const getCenter = useCallback(() => ({
    left: templateSize.width / 2,
    top: templateSize.height / 2,
  }), [templateSize.width, templateSize.height]);

  const addObj = useCallback((obj: fabric.Object, autoEditText = false) => {
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    if (autoEditText) focusTextForEdit(canvas, obj);
  }, [canvas]);

  const addText = useCallback((opts?: { text?: string; fontSize?: number; fontWeight?: string | number }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.IText(opts?.text ?? '双击编辑', {
      left: left - 80,
      top: top - 15,
      fontSize: opts?.fontSize ?? 28,
      fontWeight: opts?.fontWeight ?? 'normal',
      fontFamily: 'SimSun, serif',
      fill: '#333333',
      editable: true,
    }), true);
  }, [canvas, getCenter, addObj]);

  const addTextbox = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Textbox('双击编辑', {
      left: left - 100,
      top: top - 40,
      width: 200,
      fontSize: 14,
      fontFamily: 'SimSun, serif',
      fill: '#333333',
      editable: true,
      splitByGrapheme: true,
    }), true);
  }, [canvas, getCenter, addObj]);

  const addHeading = useCallback((level: 1 | 2) => {
    addText({
      text: level === 1 ? '标题文字' : '副标题',
      fontSize: level === 1 ? 36 : 28,
      fontWeight: level === 1 ? 'bold' : '600',
    });
  }, [addText]);

  const addPlaceholder = useCallback(() => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.IText('{{字段名}}', {
      left: left - 80,
      top: top - 15,
      fontSize: 28,
      fontFamily: 'SimSun, serif',
      fill: '#1677ff',
      editable: true,
    }));
  }, [canvas, getCenter, addObj]);

  const addPresetText = useCallback((text: string) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.IText(text, {
      left: left - 200,
      top: top - 60,
      fontSize: 12,
      fontFamily: 'Arial, SimSun, sans-serif',
      fill: '#333333',
      editable: true,
      width: 400,
    }));
  }, [canvas, getCenter, addObj]);

  const triggerImageUpload = useCallback(() => fileInputRef.current?.click(), []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      const { left, top } = getCenter();
      fabric.Image.fromURL(url, (img) => {
        const scale = Math.min(200 / (img.width || 1), 200 / (img.height || 1), 1);
        img.set({
          left: left - (img.width! * scale) / 2,
          top: top - (img.height! * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });
        addObj(img);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [canvas, getCenter, addObj]);

  const addRect = useCallback((opts?: { fill?: string; stroke?: string; rx?: number }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Rect({
      left: left - 75,
      top: top - 50,
      width: 150,
      height: 100,
      fill: opts?.fill ?? 'transparent',
      stroke: opts?.stroke ?? '#333333',
      strokeWidth: 2,
      rx: opts?.rx ?? 0,
      ry: opts?.rx ?? 0,
    }));
  }, [canvas, getCenter, addObj]);

  const addCircle = useCallback((opts?: { fill?: string; stroke?: string }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Circle({
      left: left - 50,
      top: top - 50,
      radius: 50,
      fill: opts?.fill ?? 'transparent',
      stroke: opts?.stroke ?? '#333333',
      strokeWidth: 2,
    }));
  }, [canvas, getCenter, addObj]);

  const addTriangle = useCallback((opts?: { fill?: string; stroke?: string }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.Triangle({
      left: left - 60,
      top: top - 50,
      width: 120,
      height: 100,
      fill: opts?.fill ?? '#333333',
      stroke: opts?.stroke ?? '#333333',
      strokeWidth: opts?.fill ? 0 : 2,
    }));
  }, [canvas, getCenter, addObj]);

  const addPolygon = useCallback((sides: number, opts?: { fill?: string; stroke?: string; radius?: number }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const radius = opts?.radius ?? 50;
    addObj(new fabric.Polygon(
      Array.from({ length: sides }, (_, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      }),
      {
        left: left - radius,
        top: top - radius,
        fill: opts?.fill ?? '#333333',
        stroke: opts?.stroke ?? '#333333',
        strokeWidth: opts?.fill ? 0 : 2,
      },
    ));
  }, [canvas, getCenter, addObj]);

  const addStar = useCallback((opts?: { fill?: string }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const outer = 50;
    const inner = 22;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI * i) / 5 - Math.PI / 2;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    addObj(new fabric.Polygon(points, {
      left: left - outer,
      top: top - outer,
      fill: opts?.fill ?? '#333333',
    }));
  }, [canvas, getCenter, addObj]);

  const addLine = useCallback((opts?: { dashed?: boolean; width?: number; diagonal?: boolean }) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const w = 120;
    const coords = opts?.diagonal
      ? [left - w, top + 30, left + w, top - 30]
      : [left - w, top, left + w, top];
    addObj(new fabric.Line(coords as [number, number, number, number], {
      stroke: '#333333',
      strokeWidth: opts?.width ?? 2,
      strokeDashArray: opts?.dashed ? [8, 4] : undefined,
    }));
  }, [canvas, getCenter, addObj]);

  const addArrow = useCallback((style: 'simple' | 'block' | 'double' | 'circle' = 'simple') => {
    if (!canvas) return;
    const { left, top } = getCenter();
    const w = 100;
    const line = new fabric.Line([left - w, top, left + w - 20, top], {
      stroke: '#333333',
      strokeWidth: style === 'block' ? 4 : 2,
    });
    const headSize = style === 'block' ? 14 : 10;
    const head = new fabric.Triangle({
      left: left + w - 20 - headSize / 2,
      top: top - headSize / 2,
      width: headSize,
      height: headSize,
      fill: '#333333',
      angle: 90,
    });
    if (style === 'double') {
      const head2 = new fabric.Triangle({
        left: left - w - headSize / 2,
        top: top - headSize / 2,
        width: headSize,
        height: headSize,
        fill: '#333333',
        angle: -90,
      });
      addObj(new fabric.Group([line, head, head2], { left: left - w, top: top - headSize / 2 }));
      return;
    }
    if (style === 'circle') {
      const circle = new fabric.Circle({
        left: left - w - 8,
        top: top - 8,
        radius: 8,
        fill: 'transparent',
        stroke: '#333333',
        strokeWidth: 2,
      });
      addObj(new fabric.Group([circle, line, head], { left: left - w - 8, top: top - 8 }));
      return;
    }
    addObj(new fabric.Group([line, head], { left: left - w, top: top - headSize / 2 }));
  }, [canvas, getCenter, addObj]);

  const addQRCode = useCallback(async (value = '{{qr_data}}') => {
    if (!canvas) return;
    const { left, top } = getCenter();
    try {
      const dataURL = await generateQRCodeDataURL(value, 200);
      fabric.Image.fromURL(dataURL, (img) => {
        img.set({ left: left - 50, top: top - 50, scaleX: 0.5, scaleY: 0.5 });
        (img as fabric.Image & { elementType?: string; qrValue?: string }).elementType = 'qrcode';
        (img as fabric.Image & { qrValue?: string }).qrValue = value;
        addObj(img);
      });
    } catch {
      message.error('二维码生成失败');
    }
  }, [canvas, getCenter, addObj]);

  const addBarcode = useCallback((value = '{{barcode_data}}', format: BarcodeFormat = 'CODE128') => {
    if (!canvas) return;
    const { left, top } = getCenter();
    try {
      const dataURL = generateBarcodeDataURL(value, format);
      fabric.Image.fromURL(dataURL, (img) => {
        const scale = Math.min(150 / (img.width || 1), 60 / (img.height || 1), 1);
        img.set({
          left: left - (img.width! * scale) / 2,
          top: top - (img.height! * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });
        (img as fabric.Image & { elementType?: string; barcodeValue?: string; barcodeFormat?: string }).elementType = 'barcode';
        (img as fabric.Image & { barcodeValue?: string }).barcodeValue = value;
        (img as fabric.Image & { barcodeFormat?: string }).barcodeFormat = format;
        addObj(img);
      });
    } catch {
      message.error('条形码生成失败');
    }
  }, [canvas, getCenter, addObj]);

  const addIconText = useCallback((text: string) => {
    if (!canvas) return;
    const { left, top } = getCenter();
    addObj(new fabric.IText(text, {
      left: left - 30,
      top: top - 15,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#333333',
    }));
  }, [canvas, getCenter, addObj]);

  return {
    fileInputRef,
    triggerImageUpload,
    handleImageUpload,
    addText,
    addTextbox,
    addHeading,
    addPlaceholder,
    addPresetText,
    addRect,
    addCircle,
    addTriangle,
    addPolygon,
    addStar,
    addLine,
    addArrow,
    addQRCode,
    addBarcode,
    addIconText,
  };
}
