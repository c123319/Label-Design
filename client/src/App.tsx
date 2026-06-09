import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, Button, Tooltip, Modal, Input, Select, message, InputNumber, Dropdown } from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  ImportOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import CanvasEditor from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import TopToolbar from '@/components/TopToolbar';
import PropertyPanel from '@/components/PropertyPanel';
import PageManager from '@/components/PageManager';
import ZoomBar from '@/components/ZoomBar';
import DataImport from '@/components/DataImport';
import TemplateManager from '@/components/TemplateManager';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesystemStore } from '@/store/useFilesystemStore';
import { templateApi } from '@/services/api';
import { fileSystemStorage } from '@/services/fileSystemStorage';
import './App.css';

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
    canvas, exportAsJSON,
    currentTemplateId, setCurrentTemplateId,
    copySelected, pasteObject, duplicateSelected, deleteSelected,
    selectAll, groupSelected, ungroupSelected, undo, redo,
  } = useEditorStore();

  const { directoryName, isConnected } = useFilesystemStore();

  // 启动时检查文件夹连接
  useEffect(() => {
    useFilesystemStore.getState().checkConnection();
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const store = useEditorStore.getState();
      if (e.key === 'Delete') { e.preventDefault(); store.deleteSelected(); }
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); store.redo(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleDownload(); }
      if (e.ctrlKey && e.key === 'c') { e.preventDefault(); store.copySelected(); }
      if (e.ctrlKey && e.key === 'v') { e.preventDefault(); store.pasteObject(); }
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); store.duplicateSelected(); }
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); store.selectAll(); }
      if (e.ctrlKey && e.key === 'g' && !e.shiftKey) { e.preventDefault(); store.groupSelected(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'g') { e.preventDefault(); store.ungroupSelected(); }
      if (e.key === 'v' && !e.ctrlKey) { store.setCanvasTool('select'); }
      if (e.key === 'h' && !e.ctrlKey) { store.setCanvasTool('pan'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewTemplate = useCallback(() => {
    const preset = SIZE_PRESETS[selectedPreset];
    setTemplateName(newTemplateName);
    setTemplateSize({ width: preset.width || customWidth, height: preset.height || customHeight });
    setNewTemplateOpen(false);
    message.success(`已创建模板: ${newTemplateName}`);
  }, [selectedPreset, customWidth, customHeight, newTemplateName, setTemplateName, setTemplateSize]);

  const handleDownload = useCallback(() => {
    const template = exportAsJSON();
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('模板已下载');
  }, [exportAsJSON]);

  const handleSave = useCallback(async () => {
    const template = exportAsJSON();
    const id = currentTemplateId || template.id;
    const templateToSave = { ...template, id };

    try {
      if (isConnected) {
        const permitted = await fileSystemStorage.verifyPermission();
        if (permitted) {
          await fileSystemStorage.save(templateToSave);
          setCurrentTemplateId(id);
          message.success('已保存到本地');
          return;
        }
      }
      message.warning('未连接本地文件夹，请先在模板管理中选择文件夹');
    } catch {
      message.error('保存失败');
    }
  }, [exportAsJSON, currentTemplateId, setCurrentTemplateId, isConnected]);

  const handleSaveToCloud = useCallback(async () => {
    const template = exportAsJSON();
    const id = currentTemplateId || template.id;
    const templateToSave = { ...template, id };

    try {
      if (currentTemplateId) {
        await templateApi.update(id, templateToSave);
      } else {
        await templateApi.create(templateToSave);
        setCurrentTemplateId(id);
      }
      message.success('已保存到云端');
    } catch {
      message.error('云端保存失败');
    }
  }, [exportAsJSON, currentTemplateId, setCurrentTemplateId]);

  const handleExport = useCallback((format: 'png' | 'jpg', multiplier: number) => {
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();
    // 动态网格不会出现在 canvas.toDataURL 中，无需特殊处理
    const dataURL = canvas.toDataURL({ format, quality: format === 'jpg' ? 0.92 : 1, multiplier });
    if (activeObj) canvas.setActiveObject(activeObj);
    canvas.renderAll();
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${templateName}.${format}`;
    a.click();
    message.success(`已导出 ${format.toUpperCase()} (${multiplier}x)`);
  }, [canvas, templateName]);

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
          <input className="template-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          <div className="header-actions">
            {isConnected && directoryName && (
              <Tooltip title={`模板将保存到: ${directoryName}`}>
                <span style={{ fontSize: 12, color: '#8c8c8c', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FolderOpenOutlined /> {directoryName}
                </span>
              </Tooltip>
            )}
            <Button size="small" icon={<PlusOutlined />} onClick={() => setNewTemplateOpen(true)}>新建</Button>
            <Button size="small" icon={<FolderOpenOutlined />} onClick={() => setTemplateManagerOpen(true)}>模板</Button>
            <Dropdown menu={{ items: [
              { key: 'folder', label: '保存到本地文件夹', icon: <FolderOpenOutlined />, onClick: handleSave },
              { key: 'cloud', label: '保存到云端', icon: <CloudUploadOutlined />, onClick: handleSaveToCloud },
            ] }}>
              <Button size="small" icon={<SaveOutlined />} onClick={handleDownload}>保存 ▾</Button>
            </Dropdown>
            <Dropdown menu={{ items: exportMenuItems }}>
              <Button size="small" icon={<DownloadOutlined />}>导出 ▾</Button>
            </Dropdown>
            <Button size="small" icon={<ImportOutlined />} onClick={() => setDataImportOpen(true)}>数据</Button>
          </div>
        </header>

        {/* 主内容 */}
        <div className="app-main">
          <Toolbar />
          <div className="app-content">
            <TopToolbar />
            <CanvasEditor />
            <div className="app-bottom">
              <PageManager />
              <ZoomBar />
            </div>
          </div>
          <PropertyPanel />
        </div>

        {/* 弹窗 */}
        <DataImport open={dataImportOpen} onClose={() => setDataImportOpen(false)} />
        <TemplateManager open={templateManagerOpen} onClose={() => setTemplateManagerOpen(false)} />

        <Modal title="新建模板" open={newTemplateOpen} onOk={handleNewTemplate} onCancel={() => setNewTemplateOpen(false)} okText="创建" width={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>模板名称</label>
              <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="输入模板名称" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>尺寸预设</label>
              <Select style={{ width: '100%' }} value={selectedPreset} onChange={setSelectedPreset}
                options={SIZE_PRESETS.map((p, i) => ({ value: i, label: p.label }))} />
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
