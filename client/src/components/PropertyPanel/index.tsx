import { useCallback, useEffect, useState } from 'react';
import { InputNumber, Slider, Select, Button, Tooltip, Segmented, ColorPicker, Input } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ToTopOutlined,
} from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

const FONT_FAMILIES = [
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'SimHei, sans-serif', label: '黑体' },
  { value: 'Microsoft YaHei, sans-serif', label: '微软雅黑' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

const PropertyPanel: React.FC = () => {
  const { canvas, activeObject } = useEditorStore();
  const [objProps, setObjProps] = useState<Record<string, any>>({});

  /** 从选中对象刷新属性 */
  const refreshProps = useCallback(() => {
    if (!activeObject) {
      setObjProps({});
      return;
    }
    const obj = activeObject;
    setObjProps({
      left: Math.round((obj.left ?? 0) * 100) / 100,
      top: Math.round((obj.top ?? 0) * 100) / 100,
      width: Math.round((obj.getScaledWidth?.() ?? obj.width ?? 0) * 100) / 100,
      height: Math.round((obj.getScaledHeight?.() ?? obj.height ?? 0) * 100) / 100,
      angle: obj.angle ?? 0,
      opacity: obj.opacity ?? 1,
      // 文字属性
      text: (obj as fabric.IText).text ?? '',
      fontSize: (obj as fabric.IText).fontSize ?? 28,
      fontFamily: (obj as fabric.IText).fontFamily ?? 'SimSun, serif',
      fontWeight: (obj as fabric.IText).fontWeight ?? 'normal',
      fontStyle: (obj as fabric.IText).fontStyle ?? 'normal',
      textAlign: (obj as fabric.IText).textAlign ?? 'left',
      lineHeight: (obj as fabric.IText).lineHeight ?? 1.2,
      // 形状属性
      fill: obj.fill instanceof String ? obj.fill as string : (typeof obj.fill === 'string' ? obj.fill : '#000000'),
      stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
      strokeWidth: obj.strokeWidth ?? 0,
      rx: (obj as fabric.Rect).rx ?? 0,
      // 图片属性
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      // 下划线
      underline: (obj as fabric.IText).underline ?? false,
    });
  }, [activeObject]);

  useEffect(() => {
    refreshProps();
  }, [refreshProps]);

  // 监听画布对象移动/变换，实时更新属性
  useEffect(() => {
    if (!canvas) return;
    const onUpdate = () => refreshProps();
    canvas.on('object:modified', onUpdate);
    canvas.on('object:moving', onUpdate);
    canvas.on('object:scaling', onUpdate);
    canvas.on('object:rotating', onUpdate);
    return () => {
      canvas.off('object:modified', onUpdate);
      canvas.off('object:moving', onUpdate);
      canvas.off('object:scaling', onUpdate);
      canvas.off('object:rotating', onUpdate);
    };
  }, [canvas, refreshProps]);

  /** 更新对象属性 */
  const updateProp = useCallback(
    (key: string, value: unknown) => {
      if (!activeObject || !canvas) return;
      (activeObject as any)[key] = value;
      canvas.renderAll();
      refreshProps();
    },
    [activeObject, canvas, refreshProps],
  );

  /** 更新尺寸（通过 scaleX/Y） */
  const updateSize = useCallback(
    (dimension: 'width' | 'height', value: number) => {
      if (!activeObject || !canvas) return;
      if (dimension === 'width') {
        const baseWidth = activeObject.width ?? 1;
        activeObject.set('scaleX', value / baseWidth);
      } else {
        const baseHeight = activeObject.height ?? 1;
        activeObject.set('scaleY', value / baseHeight);
      }
      canvas.renderAll();
      refreshProps();
    },
    [activeObject, canvas, refreshProps],
  );

  if (!activeObject) {
    return (
      <div className="property-panel">
        <div className="panel-empty">请选择一个元素</div>
      </div>
    );
  }

  const isText = activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox';
  const isRect = activeObject.type === 'rect';
  const isCircle = activeObject.type === 'circle';
  const isImage = activeObject.type === 'image';
  const isShape = isRect || isCircle || activeObject.type === 'line' || activeObject.type === 'group';

  return (
    <div className="property-panel">
      {/* ── 基础属性 ── */}
      <div className="panel-section">
        <div className="section-title">基础</div>
        <div className="prop-row">
          <span className="prop-label">X</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.left as number}
              onChange={(v) => v !== null && updateProp('left', v)}
              style={{ width: '100%' }}
            />
          </div>
          <span className="prop-label">Y</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.top as number}
              onChange={(v) => v !== null && updateProp('top', v)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">宽</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.width as number}
              onChange={(v) => v !== null && updateSize('width', v)}
              style={{ width: '100%' }}
            />
          </div>
          <span className="prop-label">高</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.height as number}
              onChange={(v) => v !== null && updateSize('height', v)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">旋转</span>
          <div className="prop-field">
            <Slider
              min={0}
              max={360}
              value={objProps.angle as number}
              onChange={(v) => updateProp('angle', v)}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">透明</span>
          <div className="prop-field">
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={objProps.opacity as number}
              onChange={(v) => updateProp('opacity', v)}
            />
          </div>
        </div>
      </div>

      {/* ── 文字属性 ── */}
      {isText && (
        <div className="panel-section">
          <div className="section-title">文字</div>
          <div style={{ marginBottom: 8 }}>
            <Input.TextArea
              size="small"
              value={objProps.text as string}
              onChange={(e) => updateProp('text', e.target.value)}
              autoSize={{ minRows: 2, maxRows: 5 }}
              placeholder="支持 {{占位符}}"
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">字号</span>
            <div className="prop-field">
              <InputNumber
                size="small"
                min={6}
                max={200}
                value={objProps.fontSize as number}
                onChange={(v) => v !== null && updateProp('fontSize', v)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">字体</span>
            <div className="prop-field">
              <Select
                size="small"
                value={objProps.fontFamily as string}
                onChange={(v) => updateProp('fontFamily', v)}
                options={FONT_FAMILIES}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">颜色</span>
            <div className="prop-field">
              <ColorPicker
                size="small"
                value={objProps.fill as string}
                onChange={(_, hex) => updateProp('fill', hex)}
              />
            </div>
          </div>
          <div className="prop-row">
            <Tooltip title="粗体">
              <Button
                size="small"
                type={objProps.fontWeight === 'bold' ? 'primary' : 'default'}
                onClick={() =>
                  updateProp('fontWeight', objProps.fontWeight === 'bold' ? 'normal' : 'bold')
                }
                icon={<BoldOutlined />}
              />
            </Tooltip>
            <Tooltip title="斜体">
              <Button
                size="small"
                type={objProps.fontStyle === 'italic' ? 'primary' : 'default'}
                onClick={() =>
                  updateProp('fontStyle', objProps.fontStyle === 'italic' ? 'normal' : 'italic')
                }
                icon={<ItalicOutlined />}
              />
            </Tooltip>
            <Tooltip title="下划线">
              <Button
                size="small"
                type={objProps.underline ? 'primary' : 'default'}
                onClick={() =>
                  updateProp('underline', !objProps.underline)
                }
                icon={<UnderlineOutlined />}
              />
            </Tooltip>
          </div>
          <div className="prop-row">
            <span className="prop-label">对齐</span>
            <div className="prop-field">
              <Segmented
                size="small"
                value={objProps.textAlign as string}
                onChange={(v) => updateProp('textAlign', v)}
                options={[
                  { value: 'left', icon: <VerticalAlignTopOutlined /> },
                  { value: 'center', icon: <VerticalAlignMiddleOutlined /> },
                  { value: 'right', icon: <VerticalAlignBottomOutlined /> },
                ]}
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">行高</span>
            <div className="prop-field">
              <InputNumber
                size="small"
                min={0.5}
                max={3}
                step={0.1}
                value={objProps.lineHeight as number}
                onChange={(v) => v !== null && updateProp('lineHeight', v)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 形状属性 ── */}
      {isShape && (
        <div className="panel-section">
          <div className="section-title">形状</div>
          <div className="prop-row">
            <span className="prop-label">填充</span>
            <div className="prop-field">
              <ColorPicker
                size="small"
                value={objProps.fill as string || '#ffffff'}
                onChange={(_, hex) => updateProp('fill', hex)}
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">边框色</span>
            <div className="prop-field">
              <ColorPicker
                size="small"
                value={objProps.stroke as string || '#000000'}
                onChange={(_, hex) => updateProp('stroke', hex)}
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">边框宽</span>
            <div className="prop-field">
              <InputNumber
                size="small"
                min={0}
                max={20}
                value={objProps.strokeWidth as number}
                onChange={(v) => v !== null && updateProp('strokeWidth', v)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          {isRect && (
            <div className="prop-row">
              <span className="prop-label">圆角</span>
              <div className="prop-field">
                <InputNumber
                  size="small"
                  min={0}
                  max={100}
                  value={objProps.rx as number}
                  onChange={(v) => {
                    if (v !== null) {
                      updateProp('rx', v);
                      updateProp('ry', v);
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 图片属性 ── */}
      {isImage && (
        <div className="panel-section">
          <div className="section-title">图片</div>
          <div className="prop-row">
            <span className="prop-label">缩放 X</span>
            <div className="prop-field">
              <InputNumber
                size="small"
                min={0.01}
                max={10}
                step={0.1}
                value={Math.round((objProps.scaleX as number) * 100) / 100}
                onChange={(v) => v !== null && updateProp('scaleX', v)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">缩放 Y</span>
            <div className="prop-field">
              <InputNumber
                size="small"
                min={0.01}
                max={10}
                step={0.1}
                value={Math.round((objProps.scaleY as number) * 100) / 100}
                onChange={(v) => v !== null && updateProp('scaleY', v)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 层级控制 ── */}
      <div className="panel-section">
        <div className="section-title">层级</div>
        <div className="layer-btns">
          <Button
            size="small"
            onClick={() => {
              canvas?.bringToFront(activeObject);
              canvas?.renderAll();
            }}
            icon={<ToTopOutlined />}
          >
            置顶
          </Button>
          <Button
            size="small"
            onClick={() => {
              canvas?.bringForward(activeObject);
              canvas?.renderAll();
            }}
            icon={<ArrowUpOutlined />}
          >
            上移
          </Button>
          <Button
            size="small"
            onClick={() => {
              canvas?.sendBackwards(activeObject);
              canvas?.renderAll();
            }}
            icon={<ArrowDownOutlined />}
          >
            下移
          </Button>
          <Button
            size="small"
            onClick={() => {
              canvas?.sendToBack(activeObject);
              canvas?.renderAll();
            }}
            icon={<VerticalAlignBottomOutlined />}
          >
            置底
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
