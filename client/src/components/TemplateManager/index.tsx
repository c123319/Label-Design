import { useState, useCallback, useRef } from 'react';
import { Modal, Button, Tabs, message, Empty, Tooltip } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { templateApi } from '@/services/api';
import { localTemplateStorage } from '@/services/localTemplateStorage';
import type { ITemplate } from '@shared/types/template';
import './styles.css';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ open, onClose }) => {
  const { loadFromJSON, exportAsJSON, setCurrentTemplateId } = useEditorStore();
  const [localTemplates, setLocalTemplates] = useState<ITemplate[]>([]);
  const [cloudTemplates, setCloudTemplates] = useState<ITemplate[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  /** 加载本地模板列表 */
  const loadLocalTemplates = useCallback(() => {
    setLocalTemplates(localTemplateStorage.list());
  }, []);

  /** 加载云端模板列表 */
  const loadCloudTemplates = useCallback(async () => {
    try {
      const res = await templateApi.list();
      setCloudTemplates((res as any).data || (Array.isArray(res) ? res : []));
    } catch {
      setCloudTemplates([]);
    }
  }, []);

  /** 加载模板到画布 */
  const handleLoad = useCallback((template: ITemplate) => {
    loadFromJSON(template);
    message.success(`已加载模板: ${template.name}`);
    onClose();
  }, [loadFromJSON, onClose]);

  /** 删除本地模板 */
  const handleDeleteLocal = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localTemplateStorage.remove(id);
    loadLocalTemplates();
    message.success('已删除本地模板');
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

  /** 下载云端模板到本地 */
  const handleDownloadToLocal = useCallback((template: ITemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    localTemplateStorage.save(template);
    loadLocalTemplates();
    message.success(`已下载 "${template.name}" 到本地`);
  }, [loadLocalTemplates]);

  /** 导入本地 JSON 模板文件 */
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const template = JSON.parse(event.target?.result as string) as ITemplate;
        if (!template.pages || !template.name) {
          message.error('无效的模板文件');
          return;
        }
        localTemplateStorage.save(template);
        loadLocalTemplates();
        message.success(`已导入模板: ${template.name}`);
      } catch {
        message.error('JSON 解析失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [loadLocalTemplates]);

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
    if (key === 'local') loadLocalTemplates();
    else loadCloudTemplates();
  }, [loadLocalTemplates, loadCloudTemplates]);

  /** 打开时加载本地列表 */
  const handleAfterOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      loadLocalTemplates();
      loadCloudTemplates();
    }
  }, [loadLocalTemplates, loadCloudTemplates]);

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
      width={560}
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
        defaultActiveKey="local"
        onChange={handleTabChange}
        items={[
          {
            key: 'local',
            label: '📁 本地模板',
            children: localTemplates.length === 0 ? (
              <div className="empty-state">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无本地模板"
                >
                  <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                    点击"保存"按钮将当前画布保存到本地，或"导入 JSON"加载模板文件
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
                        onClick={(e) => handleDeleteLocal(t.id, e)}
                      />
                    </>
                  )),
                )}
              </div>
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
