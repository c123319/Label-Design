import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, Button, Tooltip, Modal, Input, Select, message, InputNumber, Dropdown, Checkbox, Divider } from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  ImportOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
  PrinterOutlined,
  EditOutlined,
  CheckCircleFilled,
  DownOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import CanvasEditor from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import TopToolbar from '@/components/TopToolbar';
import PropertyPanel from '@/components/PropertyPanel';
import PageManager from '@/components/PageManager';
import DataImport from '@/components/DataImport';
import DataPreview from '@/components/DataPreview';
import BatchGenerate from '@/components/BatchGenerate';
import TemplateManager from '@/components/TemplateManager';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesystemStore } from '@/store/useFilesystemStore';
import { templateApi } from '@/services/api';
import { fileSystemStorage } from '@/services/fileSystemStorage';
import { mmToPx, pxToMm } from '@/utils/canvasMetrics';
import { exportTemplateToDataURL } from '@/utils/exportCanvas';
import { fabric } from 'fabric';
import './App.css';

const SIZE_PRESETS = [
  { label: '标签 100×70mm', width: 1181, height: 827 },
  { label: '标签 60×40mm', width: 709, height: 472 },
  { label: '标签 50×30mm', width: 591, height: 354 },
  { label: '证书 A4 横版', width: 3508, height: 2480 },
  { label: '证书 A4 竖版', width: 2480, height: 3508 },
  { label: '自定义', width: 0, height: 0 },
];

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

function App() {
  const [dataImportOpen, setDataImportOpen] = useState(false);
  const [batchGenerateOpen, setBatchGenerateOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('未命名模板');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customWidthMm, setCustomWidthMm] = useState(100);
  const [customHeightMm, setCustomHeightMm] = useState(70);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [exportTransparentBg, setExportTransparentBg] = useState(false);

  const {
    templateName, setTemplateName, setTemplateSize,
    canvas, exportAsJSON,
    currentTemplateId, setCurrentTemplateId,
    setPropertyPanelTab, dataSource,
  } = useEditorStore();

  const openDataBinding = useCallback(() => {
    setPropertyPanelTab('databinding');
    if (!dataSource) setDataImportOpen(true);
  }, [setPropertyPanelTab, dataSource]);

  const { directoryName, isConnected } = useFilesystemStore();

  useEffect(() => {
    useFilesystemStore.getState().checkConnection();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const store = useEditorStore.getState();
      const editingText = store.canvas?.getActiveObject();
      if (editingText && (editingText as fabric.IText).isEditing) return;
      if (e.key === 'Delete') { e.preventDefault(); store.deleteSelected(); }
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); store.redo(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
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
    setTemplateSize({
      width: preset.width || mmToPx(customWidthMm),
      height: preset.height || mmToPx(customHeightMm),
    });
    setNewTemplateOpen(false);
    setSaveStatus('idle');
    message.success(`已创建模板: ${newTemplateName}`);
  }, [selectedPreset, customWidthMm, customHeightMm, newTemplateName, setTemplateName, setTemplateSize]);

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

    setSaveStatus('saving');
    try {
      if (isConnected) {
        const permitted = await fileSystemStorage.verifyPermission();
        if (permitted) {
          await fileSystemStorage.save(templateToSave);
          setCurrentTemplateId(id);
          setSaveStatus('saved');
          message.success('已保存到本地');
          return;
        }
      }
      setSaveStatus('error');
      message.warning('未连接本地文件夹，请先在模板管理中选择文件夹');
    } catch {
      setSaveStatus('error');
      message.error('保存失败');
    }
  }, [exportAsJSON, currentTemplateId, setCurrentTemplateId, isConnected]);

  const handleSaveToCloud = useCallback(async () => {
    const template = exportAsJSON();
    const id = currentTemplateId || template.id;
    const templateToSave = { ...template, id };

    setSaveStatus('saving');
    try {
      if (currentTemplateId) {
        await templateApi.update(id, templateToSave);
      } else {
        await templateApi.create(templateToSave);
        setCurrentTemplateId(id);
      }
      setSaveStatus('saved');
      message.success('已保存到云端');
    } catch {
      setSaveStatus('error');
      message.error('云端保存失败');
    }
  }, [exportAsJSON, currentTemplateId, setCurrentTemplateId]);

  const handleExport = useCallback(async (format: 'png' | 'jpg', multiplier: number) => {
    if (!canvas) return;
    const { templateSize, pages, currentPageIndex } = useEditorStore.getState();
    const background = pages[currentPageIndex]?.background || '#ffffff';
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();

    try {
      const dataURL = await exportTemplateToDataURL(canvas, templateSize, {
        format: format === 'jpg' ? 'jpeg' : 'png',
        multiplier,
        transparentBackground: format === 'png' && exportTransparentBg,
        background,
      });
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `${templateName}.${format}`;
      a.click();
      const bgHint = format === 'png' && exportTransparentBg ? '透明背景' : '含背景';
      message.success(`已导出 ${format.toUpperCase()} (${multiplier}x，${bgHint})`);
    } catch {
      message.error('导出失败');
    } finally {
      if (activeObj) canvas.setActiveObject(activeObj);
      canvas.renderAll();
    }
  }, [canvas, templateName, exportTransparentBg]);

  const handlePrint = useCallback(async () => {
    if (!canvas) return;
    const { templateSize, pages, currentPageIndex } = useEditorStore.getState();
    const background = pages[currentPageIndex]?.background || '#ffffff';
    const activeObj = canvas.getActiveObject();
    canvas.discardActiveObject();

    try {
      const dataURL = await exportTemplateToDataURL(canvas, templateSize, {
        format: 'png',
        multiplier: 2,
        transparentBackground: false,
        background,
      });
      const win = window.open('');
      if (win) {
        win.document.write(`<img src="${dataURL}" style="max-width:100%" onload="window.print();window.close()" />`);
      }
    } finally {
      if (activeObj) canvas.setActiveObject(activeObj);
      canvas.renderAll();
    }
  }, [canvas]);

  const exportMenuItems = [
    { key: 'png1x', label: 'PNG 1x', onClick: () => handleExport('png', 1) },
    { key: 'png2x', label: 'PNG 2x', onClick: () => handleExport('png', 2) },
    { key: 'png3x', label: 'PNG 3x', onClick: () => handleExport('png', 3) },
    { type: 'divider' as const },
    { key: 'jpg1x', label: 'JPG 1x', onClick: () => handleExport('jpg', 1) },
    { key: 'jpg2x', label: 'JPG 2x', onClick: () => handleExport('jpg', 2) },
  ];

  const saveStatusText = {
    saved: '保存成功',
    saving: '保存中...',
    error: '保存失败',
    idle: '',
  }[saveStatus];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677FF',
          borderRadius: 6,
          fontFamily: 'var(--font-family)',
          colorText: '#1F2937',
          colorTextSecondary: '#4B5563',
          colorBorder: '#DADDE3',
        },
      }}
    >
      <div className="app-layout">
        <header className="app-header">
          <div className="header-brand">
            <div className="logo-icon">LS</div>
            <span className="logo">标签工作台</span>
          </div>

          <div className="header-divider" />

          <div className="file-info">
            <input
              className="template-name"
              value={templateName}
              onChange={(e) => { setTemplateName(e.target.value); setSaveStatus('idle'); }}
            />
            <EditOutlined className="edit-icon" />
          </div>

          <div className="header-toolbar">
            <TopToolbar />
          </div>

          <div className="header-actions">
            {isConnected && directoryName && (
              <Tooltip title={`模板将保存到: ${directoryName}`}>
                <span className="folder-hint">
                  <FolderOpenOutlined /> {directoryName}
                </span>
              </Tooltip>
            )}
            {saveStatusText && (
              <span className={`save-status ${saveStatus}`}>
                {saveStatus === 'saved' && <CheckCircleFilled />}
                {saveStatusText}
              </span>
            )}
            <Button className="header-btn" icon={<PlusOutlined />} onClick={() => setNewTemplateOpen(true)}>
              新建模板
            </Button>
            <Button className="header-btn" icon={<FolderOpenOutlined />} onClick={() => setTemplateManagerOpen(true)}>
              模板管理
            </Button>
            <Button className="header-btn" icon={<DatabaseOutlined />} onClick={openDataBinding}>
              数据绑定
            </Button>
            <Button
              className="header-btn"
              icon={<ThunderboltOutlined />}
              disabled={!dataSource}
              onClick={() => setBatchGenerateOpen(true)}
            >
              批量生成
            </Button>
            <Dropdown menu={{ items: [
              { key: 'folder', label: '保存到本地', icon: <FolderOpenOutlined />, onClick: handleSave },
              { key: 'cloud', label: '保存到云端', icon: <CloudUploadOutlined />, onClick: handleSaveToCloud },
              { key: 'download', label: '下载 JSON', icon: <DownloadOutlined />, onClick: handleDownload },
            ] }}>
              <Button className="header-btn header-btn-dropdown">
                <SaveOutlined />
                <span>保存</span>
                <DownOutlined className="dropdown-caret" />
              </Button>
            </Dropdown>
            <Dropdown
              menu={{ items: exportMenuItems }}
              dropdownRender={(menu) => (
                <div className="export-dropdown">
                  {menu}
                  <Divider style={{ margin: '4px 0' }} />
                  <div style={{ padding: '4px 12px 8px' }}>
                    <Checkbox
                      checked={exportTransparentBg}
                      onChange={(e) => setExportTransparentBg(e.target.checked)}
                    >
                      PNG 透明背景
                    </Checkbox>
                  </div>
                </div>
              )}
            >
              <Button className="header-btn" icon={<DownloadOutlined />}>导出</Button>
            </Dropdown>
            <Button type="primary" className="header-btn header-btn-primary" icon={<PrinterOutlined />} onClick={handlePrint}>
              打印
            </Button>
            <div className="user-avatar" title="用户">MA</div>
          </div>
        </header>

        <div className="app-main">
          <Toolbar onOpenDataImport={() => setDataImportOpen(true)} />
          <div className="app-content">
            <DataPreview />
            <CanvasEditor />
            <div className="app-bottom">
              <PageManager />
            </div>
          </div>
          <PropertyPanel onOpenDataImport={() => setDataImportOpen(true)} />
        </div>

        <DataImport open={dataImportOpen} onClose={() => setDataImportOpen(false)} />
        <BatchGenerate open={batchGenerateOpen} onClose={() => setBatchGenerateOpen(false)} />
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
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>宽度</label>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={420}
                      step={0.1}
                      value={customWidthMm}
                      onChange={(v) => v && setCustomWidthMm(v)}
                      addonAfter="mm"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                      {mmToPx(customWidthMm)} px
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>高度</label>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={420}
                      step={0.1}
                      value={customHeightMm}
                      onChange={(v) => v && setCustomHeightMm(v)}
                      addonAfter="mm"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                      {mmToPx(customHeightMm)} px
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
}

export default App;
