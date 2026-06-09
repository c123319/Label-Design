import { useCallback, useEffect, useState } from 'react';
import { InputNumber, Slider, Select, Button, Tooltip, Segmented, ColorPicker, Input, Switch } from 'antd';
import { pxToMm, mmToPx } from '@/utils/canvasMetrics';
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
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
} from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import { alignSelection } from '@/utils/alignObjects';
import DataBindingPanel from './DataBindingPanel';
import './styles.css';

interface PropertyPanelProps {
  onOpenDataImport?: () => void;
}

/** 垂直居中 icon */
const AlignVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="3" width="14" height="1.5" /><rect x="5" y="6.5" width="6" height="6" rx="0.5" /><rect x="1" y="13.5" width="14" height="1.5" />
  </svg>
);

const FONT_FAMILIES = [
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'SimHei, sans-serif', label: '黑体' },
  { value: 'Microsoft YaHei, sans-serif', label: '微软雅黑' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

const PropertyPanel: React.FC<PropertyPanelProps> = ({ onOpenDataImport }) => {
  const {
    canvas, activeObject, activeObjects, templateSize, setTemplateSize,
    pages, currentPageIndex, showGrid, toggleGrid, saveHistory,
    propertyPanelTab, setPropertyPanelTab,
  } = useEditorStore();
  const activeTab = propertyPanelTab;
  const setActiveTab = setPropertyPanelTab;
  const [objProps, setObjProps] = useState<Record<string, any>>({});

  const pageBackground = pages[currentPageIndex]?.background || '#ffffff';
  const isLandscape = templateSize.width >= templateSize.height;

  const updatePageBackground = useCallback((color: string) => {
    const { pages: p, currentPageIndex: idx } = useEditorStore.getState();
    const updated = [...p];
    updated[idx] = { ...updated[idx], background: color };
    useEditorStore.setState({ pages: updated });
    canvas?.requestRenderAll();
  }, [canvas]);

  const updateSizeMm = useCallback((dim: 'width' | 'height', mm: number) => {
    const px = mmToPx(mm);
    setTemplateSize({
      width: dim === 'width' ? px : templateSize.width,
      height: dim === 'height' ? px : templateSize.height,
    });
  }, [setTemplateSize, templateSize.width, templateSize.height]);

  const swapOrientation = useCallback((landscape: boolean) => {
    if (landscape === isLandscape) return;
    setTemplateSize({ width: templateSize.height, height: templateSize.width });
  }, [isLandscape, setTemplateSize, templateSize.width, templateSize.height]);

  const hasMultiple = activeObjects.length > 1;

  const align = useCallback(
    (dir: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV') => {
      if (!canvas) return;
      if (alignSelection(canvas, dir, templateSize.width, templateSize.height)) {
        saveHistory();
      }
    },
    [canvas, templateSize.width, templateSize.height, saveHistory],
  );

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
      // 字间距
      charSpacing: (obj as fabric.IText).charSpacing ?? 0,
      // 阴影
      shadow: obj.shadow as fabric.Shadow | null,
      shadowColor: (obj.shadow as fabric.Shadow)?.color ?? 'rgba(0,0,0,0.3)',
      shadowBlur: (obj.shadow as fabric.Shadow)?.blur ?? 0,
      shadowOffsetX: (obj.shadow as fabric.Shadow)?.offsetX ?? 0,
      shadowOffsetY: (obj.shadow as fabric.Shadow)?.offsetY ?? 0,
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
      activeObject.set(key as keyof fabric.Object, value as never);
      activeObject.setCoords();
      canvas.requestRenderAll();
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

  const renderCanvasSettings = () => (
    <div className="panel-section">
      <div className="section-title">画布设置</div>
      <div className="prop-row">
        <span className="prop-label">标签尺寸</span>
        <div className="prop-field-split">
          <InputNumber
            size="small"
            min={1}
            value={pxToMm(templateSize.width)}
            onChange={(v) => v !== null && updateSizeMm('width', v)}
            style={{ flex: 1 }}
          />
          <span className="prop-unit">mm</span>
          <span style={{ color: 'var(--text-tertiary)' }}>×</span>
          <InputNumber
            size="small"
            min={1}
            value={pxToMm(templateSize.height)}
            onChange={(v) => v !== null && updateSizeMm('height', v)}
            style={{ flex: 1 }}
          />
          <span className="prop-unit">mm</span>
        </div>
      </div>
      <div className="prop-row">
        <span className="prop-label">方向</span>
        <div className="prop-field">
          <div className="orientation-btns">
            <button type="button" className={`orientation-btn ${isLandscape ? 'active' : ''}`} onClick={() => swapOrientation(true)}>横向</button>
            <button type="button" className={`orientation-btn ${!isLandscape ? 'active' : ''}`} onClick={() => swapOrientation(false)}>纵向</button>
          </div>
        </div>
      </div>
      <div className="prop-row">
        <span className="prop-label">背景</span>
        <div className="prop-field">
          <ColorPicker size="small" value={pageBackground} onChange={(_, hex) => updatePageBackground(hex)} />
        </div>
      </div>
      <div className="prop-row">
        <span className="prop-label">显示网格</span>
        <div className="prop-field">
          <Switch size="small" checked={showGrid} onChange={(v) => toggleGrid(v)} />
        </div>
      </div>
      <div className="prop-row">
        <span className="prop-label">网格间距</span>
        <div className="prop-field-split">
          <InputNumber size="small" value={2} disabled style={{ flex: 1 }} />
          <span className="prop-unit">mm</span>
        </div>
      </div>
      <div className="prop-row">
        <span className="prop-label">页面边距</span>
        <div className="prop-field-split">
          <InputNumber size="small" value={4} disabled style={{ flex: 1 }} />
          <span className="prop-unit">mm</span>
        </div>
      </div>
    </div>
  );

  const isText = activeObject?.type === 'i-text' || activeObject?.type === 'text' || activeObject?.type === 'textbox';
  const isRect = activeObject?.type === 'rect';
  const isCircle = activeObject?.type === 'circle';
  const isImage = activeObject?.type === 'image';
  const isShape = isRect || isCircle || activeObject?.type === 'line' || activeObject?.type === 'group';

  return (
    <div className="property-panel">
      <div className="panel-tabs">
        <button type="button" className={`panel-tab ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab('style')}>样式</button>
        <button type="button" className={`panel-tab ${activeTab === 'databinding' ? 'active' : ''}`} onClick={() => setActiveTab('databinding')}>数据绑定</button>
      </div>

      <div className="panel-body">
        {activeTab === 'databinding' && (
          <DataBindingPanel activeObject={activeObject} onOpenDataImport={onOpenDataImport} />
        )}

        {activeTab === 'style' && !activeObject && (
          <>
            {renderCanvasSettings()}
            <div className="panel-empty">
              <div className="panel-empty-title">请选择一个元素</div>
              <div className="panel-empty-desc">选中画布中的文字、图形、条码或图片后，可在这里编辑属性。</div>
            </div>
          </>
        )}

        {activeTab === 'style' && activeObject && (
          <>
      {/* ── 基础属性 ── */}
      <div className="panel-section">
        <div className="section-title">基础</div>
        <div className="prop-row prop-row-dual-unit">
          <span className="prop-label">X</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.left as number}
              onChange={(v) => v !== null && updateProp('left', v)}
              style={{ width: '100%' }}
              addonAfter="px"
            />
            <div className="prop-dual-unit-secondary">{pxToMm(objProps.left as number)} mm</div>
          </div>
          <span className="prop-label">Y</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.top as number}
              onChange={(v) => v !== null && updateProp('top', v)}
              style={{ width: '100%' }}
              addonAfter="px"
            />
            <div className="prop-dual-unit-secondary">{pxToMm(objProps.top as number)} mm</div>
          </div>
        </div>
        <div className="prop-row prop-row-dual-unit">
          <span className="prop-label">宽</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.width as number}
              onChange={(v) => v !== null && updateSize('width', v)}
              style={{ width: '100%' }}
              addonAfter="px"
            />
            <div className="prop-dual-unit-secondary">{pxToMm(objProps.width as number)} mm</div>
          </div>
          <span className="prop-label">高</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              value={objProps.height as number}
              onChange={(v) => v !== null && updateSize('height', v)}
              style={{ width: '100%' }}
              addonAfter="px"
            />
            <div className="prop-dual-unit-secondary">{pxToMm(objProps.height as number)} mm</div>
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

      {/* ── 对齐（多选） ── */}
      <div className="panel-section">
        <div className="section-title">对齐</div>
        <div className="align-btns">
          <Tooltip title={hasMultiple ? '左对齐' : '对齐画布左侧'}>
            <Button size="small" onClick={() => align('left')} icon={<AlignLeftOutlined />} />
          </Tooltip>
          <Tooltip title={hasMultiple ? '水平居中' : '对齐画布水平中心'}>
            <Button size="small" onClick={() => align('centerH')} icon={<AlignCenterOutlined />} />
          </Tooltip>
          <Tooltip title={hasMultiple ? '右对齐' : '对齐画布右侧'}>
            <Button size="small" onClick={() => align('right')} icon={<AlignRightOutlined />} />
          </Tooltip>
          <Tooltip title={hasMultiple ? '上对齐' : '对齐画布顶部'}>
            <Button size="small" onClick={() => align('top')} icon={<VerticalAlignTopOutlined />} />
          </Tooltip>
          <Tooltip title={hasMultiple ? '垂直居中' : '对齐画布垂直中心'}>
            <Button size="small" onClick={() => align('centerV')} icon={<AlignVIcon />} />
          </Tooltip>
          <Tooltip title={hasMultiple ? '下对齐' : '对齐画布底部'}>
            <Button size="small" onClick={() => align('bottom')} icon={<VerticalAlignBottomOutlined />} />
          </Tooltip>
        </div>
        <div className="align-hint">
          {hasMultiple ? '多选：元素之间互相对齐' : '单选：相对整个画布对齐'}
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
          <div className="prop-row">
            <span className="prop-label">字间距</span>
            <div className="prop-field">
              <InputNumber
                size="small"
                min={-200}
                max={800}
                step={10}
                value={objProps.charSpacing as number}
                onChange={(v) => v !== null && updateProp('charSpacing', v)}
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

      {/* ── 阴影 ── */}
      <div className="panel-section">
        <div className="section-title">阴影</div>
        <div className="prop-row">
          <span className="prop-label">颜色</span>
          <div className="prop-field">
            <ColorPicker
              size="small"
              value={objProps.shadowColor as string}
              onChange={(_, hex) => {
                if (!activeObject || !canvas) return;
                activeObject.set('shadow', new fabric.Shadow({
                  color: hex,
                  blur: objProps.shadowBlur as number,
                  offsetX: objProps.shadowOffsetX as number,
                  offsetY: objProps.shadowOffsetY as number,
                }));
                canvas.renderAll();
                refreshProps();
              }}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">模糊</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              min={0}
              max={50}
              value={objProps.shadowBlur as number}
              onChange={(v) => {
                if (v !== null && activeObject && canvas) {
                  activeObject.set('shadow', new fabric.Shadow({
                    color: objProps.shadowColor as string,
                    blur: v,
                    offsetX: objProps.shadowOffsetX as number,
                    offsetY: objProps.shadowOffsetY as number,
                  }));
                  canvas.renderAll();
                  refreshProps();
                }
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">偏移 X</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              min={-20}
              max={20}
              value={objProps.shadowOffsetX as number}
              onChange={(v) => {
                if (v !== null && activeObject && canvas) {
                  activeObject.set('shadow', new fabric.Shadow({
                    color: objProps.shadowColor as string,
                    blur: objProps.shadowBlur as number,
                    offsetX: v,
                    offsetY: objProps.shadowOffsetY as number,
                  }));
                  canvas.renderAll();
                  refreshProps();
                }
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="prop-row">
          <span className="prop-label">偏移 Y</span>
          <div className="prop-field">
            <InputNumber
              size="small"
              min={-20}
              max={20}
              value={objProps.shadowOffsetY as number}
              onChange={(v) => {
                if (v !== null && activeObject && canvas) {
                  activeObject.set('shadow', new fabric.Shadow({
                    color: objProps.shadowColor as string,
                    blur: objProps.shadowBlur as number,
                    offsetX: objProps.shadowOffsetX as number,
                    offsetY: v,
                  }));
                  canvas.renderAll();
                  refreshProps();
                }
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

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
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;
