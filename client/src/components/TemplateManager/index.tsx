import { useState, useCallback, useRef, useMemo } from 'react';
import { Modal, Button, Tabs, message, Empty, Tooltip, Input, Select, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesystemStore } from '@/store/useFilesystemStore';
import { templateApi } from '@/services/api';
import { fileSystemStorage } from '@/services/fileSystemStorage';
import { templateStoreService } from '@/services/templateStore';
import { useTemplateStore } from '@/hooks/useTemplateStore';
import { useStoreTemplate } from '@/hooks/useStore';
import { BACKEND_STORE_ENABLED } from '@/config/templateStore';
import type { ITemplate } from '@shared/types/template';
import type { ITemplateStoreEntry } from '@shared/types/templateStore';
import './styles.css';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ open, onClose }) => {
  const { loadFromJSON, exportAsJSON, setCurrentTemplateId } = useEditorStore();
  const [cloudTemplates, setCloudTemplates] = useState<ITemplate[]>([]);
  const [localTemplates, setLocalTemplates] = useState<ITemplate[]>([]);
  const [activeTab, setActiveTab] = useState('library');
  const [libraryFilter, setLibraryFilter] = useState('featured');
  const [librarySearch, setLibrarySearch] = useState('');
  const [loadingLibraryId, setLoadingLibraryId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const templateStore = useTemplateStore(open && activeTab === 'library');
  const backendStore = useStoreTemplate('backend', open && activeTab === 'private');

  const [privateFilter, setPrivateFilter] = useState('all');
  const [privateSearch, setPrivateSearch] = useState('');
  const [loadingPrivateId, setLoadingPrivateId] = useState<string | null>(null);

  const {
    directoryName, isConnected, isSupported, isConnecting,
    connect, disconnect, requestPermission,
  } = useFilesystemStore();

  /** 加载本地（文件夹）模板列表 */
  const loadLocalTemplates = useCallback(async () => {
    if (!isConnected) return;
    try {
      const templates = await fileSystemStorage.list();
      setLocalTemplates(templates);
    } catch {
      setLocalTemplates([]);
    }
  }, [isConnected]);

  /** 加载云端模板列表 */
  const loadCloudTemplates = useCallback(async () => {
    try {
      const res = await templateApi.list();
      setCloudTemplates((res as any).data || (Array.isArray(res) ? res : []));
    } catch {
      setCloudTemplates([]);
    }
  }, []);

  const libraryEntries = useMemo(() => {
    const byCategory = templateStore.filterByCategory(libraryFilter);
    return templateStoreService.search(byCategory, librarySearch);
  }, [templateStore.entries, libraryFilter, librarySearch]);

  const privateEntries = useMemo(() => {
    const byCategory = backendStore.filterByCategory(privateFilter);
    return templateStoreService.search(byCategory, privateSearch);
  }, [backendStore.entries, privateFilter, privateSearch]);

  /** 从私有模板库（自部署后端）加载 */
  const handleLoadFromBackend = useCallback(async (entry: ITemplateStoreEntry) => {
    setLoadingPrivateId(entry.id);
    try {
      const template = await backendStore.loadTemplate(entry);
      if (template) {
        loadFromJSON(template);
        setCurrentTemplateId(template.id);
        message.success(`已加载模板: ${template.name}`);
        onClose();
      }
    } finally {
      setLoadingPrivateId(null);
    }
  }, [backendStore, loadFromJSON, setCurrentTemplateId, onClose]);

  /** 从远程模板库加载 */
  const handleLoadFromStore = useCallback(async (entry: ITemplateStoreEntry) => {
    setLoadingLibraryId(entry.id);
    try {
      const template = await templateStore.loadTemplate(entry);
      if (template) {
        loadFromJSON(template);
        setCurrentTemplateId(template.id);
        message.success(`已加载模板: ${template.name}`);
        onClose();
      }
    } finally {
      setLoadingLibraryId(null);
    }
  }, [templateStore, loadFromJSON, setCurrentTemplateId, onClose]);

  /** 加载模板到画布 */
  const handleLoad = useCallback((template: ITemplate) => {
    loadFromJSON(template);
    setCurrentTemplateId(template.id);
    message.success(`已加载模板: ${template.name}`);
    onClose();
  }, [loadFromJSON, setCurrentTemplateId, onClose]);

  /** 删除本地（文件夹）模板 */
  const handleDeleteLocal = useCallback(async (template: ITemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ok = await fileSystemStorage.remove(template.name || template.id);
      if (ok) {
        loadLocalTemplates();
        message.success('已删除本地模板');
      } else {
        message.error('删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  }, [loadLocalTemplates]);

  /** 删除云端模板 */
  const handleDeleteCloud = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await templateApi.delete(id);
      loadCloudTemplates();
      message.success('已删除云端模板');
    } catch {
      message.error('删除失败');
    }
  }, [loadCloudTemplates]);

  /** 上传本地模板到云端 */
  const handleUploadToCloud = useCallback(async (template: ITemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await templateApi.create(template);
      loadCloudTemplates();
      message.success(`已上传 "${template.name}" 到云端`);
    } catch {
      message.error('上传失败');
    }
  }, [loadCloudTemplates]);

  /** 下载云端模板到本地文件夹 */
  const handleDownloadToLocal = useCallback(async (template: ITemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isConnected) {
        const permitted = await fileSystemStorage.verifyPermission();
        if (permitted) {
          await fileSystemStorage.save(template);
          loadLocalTemplates();
          message.success(`已下载 "${template.name}" 到本地`);
          return;
        }
      }
      message.warning('未连接本地文件夹');
    } catch {
      message.error('下载失败');
    }
  }, [isConnected, loadLocalTemplates]);

  /** 导入 JSON 模板文件到本地文件夹 */
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const template = JSON.parse(event.target?.result as string) as ITemplate;
        if (!template.pages || !template.name) {
          message.error('无效的模板文件');
          return;
        }
        if (isConnected) {
          const permitted = await fileSystemStorage.verifyPermission();
          if (permitted) {
            await fileSystemStorage.save(template);
            loadLocalTemplates();
            message.success(`已导入模板: ${template.name}`);
            return;
          }
        }
        message.warning('未连接本地文件夹，请先选择文件夹');
      } catch {
        message.error('JSON 解析失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [isConnected, loadLocalTemplates]);

  /** 导出当前模板为 JSON 文件下载 */
  const handleExportJSON = useCallback(() => {
    const template = exportAsJSON();
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('模板已导出');
  }, [exportAsJSON]);

  /** Tab 切换时加载对应数据 */
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    if (key === 'local') loadLocalTemplates();
    else if (key === 'cloud') loadCloudTemplates();
  }, [loadLocalTemplates, loadCloudTemplates]);

  /** 打开时加载数据 */
  const handleAfterOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      setActiveTab('library');
      loadLocalTemplates();
      loadCloudTemplates();
    }
  }, [loadLocalTemplates, loadCloudTemplates]);

  /**
   * 渲染模板库卡片网格（GitHub / 私有库共用）。
   * store 接口与 useTemplateStore / useStoreTemplate 返回值一致。
   */
  const renderLibraryGrid = (
    store: ReturnType<typeof useTemplateStore>,
    entries: ITemplateStoreEntry[],
    loadingId: string | null,
    onLoad: (entry: ITemplateStoreEntry) => void,
  ) => {
    if (store.loading) {
      return <div className="library-loading"><Spin tip="加载模板库..." /></div>;
    }
    if (store.error) {
      return (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={store.error}>
          <Button onClick={() => store.reload()}>重新加载</Button>
        </Empty>
      );
    }
    if (entries.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配模板" />;
    }
    return (
      <div className="library-grid">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="library-card"
            disabled={loadingId === entry.id}
            onClick={() => onLoad(entry)}
          >
            <div className="library-card-thumb">
              <img
                src={store.getThumbnailUrl(entry)}
                alt={entry.name}
                loading="lazy"
              />
            </div>
            <div className="library-card-info">
              <div className="library-card-name">{entry.name}</div>
              <div className="library-card-meta">
                {entry.width}×{entry.height}{entry.unit}
                {entry.featured && <span className="library-badge">精选</span>}
              </div>
              {entry.tags && entry.tags.length > 0 && (
                <div className="library-card-tags">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="library-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  /** 渲染模板列表项 */
  const renderTemplateItem = (
    template: ITemplate,
    actions: React.ReactNode,
  ) => (
    <div key={template.id} className="template-item" onClick={() => handleLoad(template)}>
      <div className="info">
        <div className="name">{template.name}</div>
        <div className="meta">
          {template.pages?.length || 0} 页 · {template.updatedAt ? new Date(template.updatedAt).toLocaleString() : ''}
        </div>
      </div>
      <div className="actions">{actions}</div>
    </div>
  );

  return (
    <Modal
      title="模板管理"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="import" icon={<UploadOutlined />} onClick={() => importRef.current?.click()}>导入 JSON</Button>,
        <Button key="export" icon={<DownloadOutlined />} onClick={handleExportJSON}>导出当前</Button>,
        <Button key="close" onClick={onClose}>关闭</Button>,
      ]}
      width={720}
      className="template-manager"
      afterOpenChange={handleAfterOpenChange}
    >
      <input
        ref={importRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'library',
            label: '📚 模板库',
            children: (
              <>
                <div className="library-toolbar">
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索模板"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    allowClear
                  />
                  <Select
                    value={libraryFilter}
                    onChange={setLibraryFilter}
                    loading={templateStore.loading}
                    options={templateStore.categories.map((c) => ({
                      value: c.code,
                      label: c.name,
                    }))}
                  />
                  <Tooltip title="刷新模板库">
                    <Button
                      icon={<ReloadOutlined />}
                      loading={templateStore.loading}
                      onClick={() => templateStore.reload()}
                    />
                  </Tooltip>
                </div>
                {templateStore.version && (
                  <div className="library-version">版本 {templateStore.version}</div>
                )}
                {renderLibraryGrid(
                  templateStore,
                  libraryEntries,
                  loadingLibraryId,
                  handleLoadFromStore,
                )}
              </>
            ),
          },
          {
            key: 'private',
            label: '🔒 私有模板库',
            children: !BACKEND_STORE_ENABLED ? (
              <div className="empty-state">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="未启用私有模板库"
                >
                  <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                    部署后端服务并配置 VITE_BACKEND_STORE_BASE_URL 后可用
                  </p>
                </Empty>
              </div>
            ) : (
              <>
                <div className="library-toolbar">
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索模板"
                    value={privateSearch}
                    onChange={(e) => setPrivateSearch(e.target.value)}
                    allowClear
                  />
                  <Select
                    value={privateFilter}
                    onChange={setPrivateFilter}
                    loading={backendStore.loading}
                    options={[
                      { value: 'all', label: '全部' },
                      ...backendStore.categories.map((c) => ({
                        value: c.code,
                        label: c.name,
                      })),
                    ]}
                  />
                  <Tooltip title="刷新私有模板库">
                    <Button
                      icon={<ReloadOutlined />}
                      loading={backendStore.loading}
                      onClick={() => backendStore.reload()}
                    />
                  </Tooltip>
                </div>
                {backendStore.version && (
                  <div className="library-version">版本 {backendStore.version}</div>
                )}
                {renderLibraryGrid(
                  backendStore,
                  privateEntries,
                  loadingPrivateId,
                  handleLoadFromBackend,
                )}
              </>
            ),
          },
          {
            key: 'local',
            label: '📁 本地模板',
            children: !isSupported ? (
              <div className="empty-state">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="浏览器不支持文件夹访问"
                >
                  <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                    请使用 Chrome 或 Edge 浏览器以使用此功能
                  </p>
                </Empty>
              </div>
            ) : !isConnected && !directoryName ? (
              <div className="empty-state">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="未连接文件夹"
                >
                  <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    loading={isConnecting}
                    onClick={() => connect().then(() => loadLocalTemplates())}
                  >
                    选择文件夹
                  </Button>
                </Empty>
              </div>
            ) : !isConnected && directoryName ? (
              <div className="empty-state">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={`文件夹 "${directoryName}" 需要重新授权`}
                >
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <Button
                      type="primary"
                      onClick={async () => {
                        const ok = await requestPermission();
                        if (ok) loadLocalTemplates();
                      }}
                    >
                      重新授权
                    </Button>
                    <Button onClick={() => disconnect()}>断开连接</Button>
                  </div>
                </Empty>
              </div>
            ) : (
              <>
                <div className="folder-banner">
                  <div className="folder-name">
                    <FolderOpenOutlined /> {directoryName}
                  </div>
                  <Button size="small" onClick={() => disconnect()}>断开</Button>
                </div>
                {localTemplates.length === 0 ? (
                  <div className="empty-state">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="文件夹中暂无模板"
                    >
                      <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                        点击"保存"将当前画布保存到此文件夹，或"导入 JSON"加载模板文件
                      </p>
                    </Empty>
                  </div>
                ) : (
                  <div className="template-list">
                    {localTemplates.map((t) =>
                      renderTemplateItem(t, (
                        <>
                          <Tooltip title="上传到云端">
                            <Button
                              size="small"
                              icon={<CloudUploadOutlined />}
                              onClick={(e) => handleUploadToCloud(t, e)}
                            />
                          </Tooltip>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => handleDeleteLocal(t, e)}
                          />
                        </>
                      )),
                    )}
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'cloud',
            label: '☁️ 云端模板',
            children: cloudTemplates.length === 0 ? (
              <div className="empty-state">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无云端模板"
                >
                  <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                    将本地模板上传到云端，或点击"保存"同步到云端
                  </p>
                </Empty>
              </div>
            ) : (
              <div className="template-list">
                {cloudTemplates.map((t) =>
                  renderTemplateItem(t, (
                    <>
                      <Tooltip title="下载到本地">
                        <Button
                          size="small"
                          icon={<CloudDownloadOutlined />}
                          onClick={(e) => handleDownloadToLocal(t, e)}
                        />
                      </Tooltip>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => handleDeleteCloud(t.id, e)}
                      />
                    </>
                  )),
                )}
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default TemplateManager;
