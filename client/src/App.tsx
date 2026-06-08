import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, Button, Tooltip, Modal, Input, Select, message, InputNumber, Dropdown } from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  ImportOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import CanvasEditor from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import PropertyPanel from '@/components/PropertyPanel';
import PageManager from '@/components/PageManager';
import DataImport from '@/components/DataImport';
import TemplateManager from '@/components/TemplateManager';
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
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('未命名模板');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);

  const {
    templateName, setTemplateName, templateSize, setTemplateSize,
    zoom, setZoom, canvas, exportAsJSON,
    copySelected, pasteObject, duplicateSelected, deleteSelected,
    selectAll, groupSelected, ungroupSelected, undo, redo,
  } = useEditorStore();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框内，不拦截
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const store = useEditorStore.getState();

      // Delete 删除
      if (e.key === 'Delete') {
        e.preventDefault();
        store.deleteSelected();
      }
      // Ctrl+Z 撤销
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }
      // Ctrl+Y 重做
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        store.redo();
      }
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+C 复制
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        store.copySelected();
      }
      // Ctrl+V 粘贴
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        store.pasteObject();
      }
      // Ctrl+D 快捷复制
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        store.duplicateSelected();
      }
      // Ctrl+A 全选
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        store.selectAll();
      }
      // Ctrl+G 组合
      if (e.ctrlKey && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        store.groupSelected();
      }
      // Ctrl+Shift+G 解组
      if (e.ctrlKey && e.shiftKey && e.key === 'g') {
        e.preventDefault();
        store.ungroupSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  /** 导出图片 */
  const handleExport = useCallback((format: 'png' | 'jpg', multiplier: number) => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();

    // 隐藏网格
    canvas.getObjects().forEach((obj) => {
      if ((obj as any)._isGrid) obj.set('visible', false);
    });

    const dataURL = canvas.toDataURL({
      format,
      quality: format === 'jpg' ? 0.92 : 1,
      multiplier,
    });

    // 恢复
    canvas.getObjects().forEach((obj) => {
      if ((obj as any)._isGrid) obj.set('visible', useEditorStore.getState().showGrid);
    });
    if (activeObj) canvas.setActiveObject(activeObj);
    canvas.renderAll();

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${templateName}.${format}`;
    a.click();
    message.success(`已导出 ${format.toUpperCase()} (${multiplier}x)`);
  }, [canvas, templateName]);

  /** 缩放控制 */
  const handleZoomIn = useCallback(() => setZoom(Math.min(zoom + 0.1, 5)), [zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(Math.max(zoom - 0.1, 0.1)), [zoom, setZoom]);
  const handleZoomFit = useCallback(() => {
    if (!canvas) return;
    const container = canvas.getElement().parentElement?.parentElement;
    if (!container) return;
    const scaleX = (container.clientWidth - 40) / templateSize.width;
    const scaleY = (container.clientHeight - 40) / templateSize.height;
    setZoom(Math.round(Math.min(scaleX, scaleY, 1) * 100) / 100);
  }, [canvas, templateSize, setZoom]);

  /** 导出下拉菜单 */
  const exportMenuItems = [
    { key: 'png1x', label: 'PNG 1x', onClick: () => handleExport('png', 1) },
    { key: 'png2x', label: 'PNG 2x', onClick: () => handleExport('png', 2) },
    { key: 'png3x', label: 'PNG 3x', onClick: () => handleExport('png', 3) },
    { type: 'divider' as const },
    { key: 'jpg1x', label: 'JPG 1x', onClick: () => handleExport('jpg', 1) },
    { key: 'jpg2x', label: 'JPG 2x', onClick: () => handleExport('jpg', 2) },
  ];

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
              <Button size="small" icon={<PlusOutlined />} onClick={() => setNewTemplateOpen(true)}>新建</Button>
            </Tooltip>
            <Tooltip title="模板管理">
              <Button size="small" icon={<FolderOpenOutlined />} onClick={() => setTemplateManagerOpen(true)}>模板</Button>
            </Tooltip>
            <Tooltip title="保存 (Ctrl+S)">
              <Button size="small" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
            </Tooltip>
            <Dropdown menu={{ items: exportMenuItems }}>
              <Button size="small" icon={<DownloadOutlined />}>导出 ▾</Button>
            </Dropdown>
            <Tooltip title="批量数据导入">
              <Button size="small" icon={<ImportOutlined />} onClick={() => setDataImportOpen(true)}>数据</Button>
            </Tooltip>
            <span className="zoom-display">{Math.round(zoom * 100)}%</span>
            <Tooltip title="缩小"><Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} /></Tooltip>
            <Tooltip title="适应"><Button size="small" icon={<ExpandOutlined />} onClick={handleZoomFit} /></Tooltip>
            <Tooltip title="放大"><Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} /></Tooltip>
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

        {/* 弹窗 */}
        <DataImport open={dataImportOpen} onClose={() => setDataImportOpen(false)} />
        <TemplateManager open={templateManagerOpen} onClose={() => setTemplateManagerOpen(false)} />

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
              <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="输入模板名称" />
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
                  <InputNumber style={{ width: '100%' }} min={100} max={5000} value={customWidth} onChange={(v) => v && setCustomWidth(v)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>高度 (px)</label>
                  <InputNumber style={{ width: '100%' }} min={100} max={5000} value={customHeight} onChange={(v) => v && setCustomHeight(v)} />
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
