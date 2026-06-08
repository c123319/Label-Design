import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, Button, Tooltip, Modal, Input, Select, message, InputNumber } from 'antd';
import {
  FileOutlined,
  SaveOutlined,
  DownloadOutlined,
  ImportOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import CanvasEditor from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import PropertyPanel from '@/components/PropertyPanel';
import PageManager from '@/components/PageManager';
import DataImport from '@/components/DataImport';
import { useEditorStore } from '@/store/useEditorStore';
import { templateApi } from '@/services/api';
import './App.css';

/** 新建模板预设尺寸 */
const SIZE_PRESETS = [
  { label: '标签 100×70mm', width: 1181, height: 827 },
  { label: '标签 60×40mm', width: 709, height: 472 },
  { label: '标签 50×30mm', width: 591, height: 354 },
  { label: '证书 A4 横版', width: 3508, height: 2480 },
  { label: '证书 A4 竖版', width: 2480, height: 3508 },
  { label: '自定义', width: 0, height: 0 },
];

function App() {
  const [dataImportOpen, setDataImportOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('未命名模板');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);

  const { templateName, setTemplateName, templateSize, setTemplateSize, zoom, setZoom, canvas, exportAsJSON, activeObject } =
    useEditorStore();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete 删除选中元素
      if (e.key === 'Delete' && activeObject) {
        canvas?.remove(activeObject);
        canvas?.discardActiveObject();
        canvas?.renderAll();
      }
      // Ctrl+Z 撤销
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      // Ctrl+Y / Ctrl+Shift+Z 重做
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas, activeObject]);

  /** 新建模板 */
  const handleNewTemplate = useCallback(() => {
    const preset = SIZE_PRESETS[selectedPreset];
    const w = preset.width || customWidth;
    const h = preset.height || customHeight;
    setTemplateName(newTemplateName);
    setTemplateSize({ width: w, height: h });
    setNewTemplateOpen(false);
    message.success(`已创建模板: ${newTemplateName}`);
  }, [selectedPreset, customWidth, customHeight, newTemplateName, setTemplateName, setTemplateSize]);

  /** 保存模板 */
  const handleSave = useCallback(async () => {
    const template = exportAsJSON();
    try {
      await templateApi.create(template);
      message.success('模板已保存');
    } catch {
      // 后端可能还没完全实现，降级为本地下载 JSON
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('模板已导出为 JSON 文件');
    }
  }, [exportAsJSON, templateName]);

  /** 导出为 PNG */
  const handleExportPNG = useCallback(() => {
    if (!canvas) return;
    // 临时移除选中框
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2, // 2x 分辨率
    });

    // 恢复选中
    if (activeObj) canvas.setActiveObject(activeObj);

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${templateName}.png`;
    a.click();
    message.success('已导出 PNG');
  }, [canvas, templateName]);

  /** 缩放控制 */
  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(zoom + 0.1, 5));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(zoom - 0.1, 0.1));
  }, [zoom, setZoom]);

  const handleZoomFit = useCallback(() => {
    if (!canvas) return;
    const container = canvas.getElement().parentElement?.parentElement;
    if (!container) return;
    const scaleX = (container.clientWidth - 40) / templateSize.width;
    const scaleY = (container.clientHeight - 40) / templateSize.height;
    const newZoom = Math.min(scaleX, scaleY, 1);
    setZoom(Math.round(newZoom * 100) / 100);
  }, [canvas, templateSize, setZoom]);

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app-layout">
        {/* Header */}
        <header className="app-header">
          <span className="logo">Label Design</span>
          <input
            className="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <div className="header-actions">
            <Tooltip title="新建模板">
              <Button size="small" icon={<PlusOutlined />} onClick={() => setNewTemplateOpen(true)}>
                新建
              </Button>
            </Tooltip>
            <Tooltip title="保存 (Ctrl+S)">
              <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>
                保存
              </Button>
            </Tooltip>
            <Tooltip title="导出 PNG">
              <Button size="small" icon={<DownloadOutlined />} onClick={handleExportPNG}>
                导出
              </Button>
            </Tooltip>
            <Tooltip title="批量数据导入">
              <Button size="small" icon={<ImportOutlined />} onClick={() => setDataImportOpen(true)}>
                数据
              </Button>
            </Tooltip>
            <span className="zoom-display">{Math.round(zoom * 100)}%</span>
            <Tooltip title="缩小">
              <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            </Tooltip>
            <Tooltip title="适应画布">
              <Button size="small" icon={<ExpandOutlined />} onClick={handleZoomFit} />
            </Tooltip>
            <Tooltip title="放大">
              <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            </Tooltip>
          </div>
        </header>

        {/* 主内容 */}
        <main className="app-main">
          <Toolbar />
          <CanvasEditor />
          <PropertyPanel />
        </main>

        {/* 底部页面管理 */}
        <PageManager />

        {/* 数据导入弹窗 */}
        <DataImport open={dataImportOpen} onClose={() => setDataImportOpen(false)} />

        {/* 新建模板弹窗 */}
        <Modal
          title="新建模板"
          open={newTemplateOpen}
          onOk={handleNewTemplate}
          onCancel={() => setNewTemplateOpen(false)}
          okText="创建"
          width={400}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>模板名称</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="输入模板名称"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>尺寸预设</label>
              <Select
                style={{ width: '100%' }}
                value={selectedPreset}
                onChange={setSelectedPreset}
                options={SIZE_PRESETS.map((p, i) => ({ value: i, label: p.label }))}
              />
            </div>
            {selectedPreset === SIZE_PRESETS.length - 1 && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>宽度 (px)</label>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={100}
                    max={5000}
                    value={customWidth}
                    onChange={(v) => v && setCustomWidth(v)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>高度 (px)</label>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={100}
                    max={5000}
                    value={customHeight}
                    onChange={(v) => v && setCustomHeight(v)}
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
}

export default App;
