import { useState, useCallback, useRef } from 'react';
import { Modal, Button, Upload, message, Empty } from 'antd';
import { DeleteOutlined, DownloadOutlined, UploadOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { templateApi } from '@/services/api';
import type { ITemplate } from '@shared/types/template';
import './styles.css';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ open, onClose }) => {
  const { loadFromJSON, exportAsJSON } = useEditorStore();
  const [templates, setTemplates] = useState<ITemplate[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  /** 加载模板列表 */
  const loadTemplates = useCallback(async () => {
    try {
      const res = await templateApi.list();
      setTemplates((res as any).data || (Array.isArray(res) ? res : []));
    } catch {
      setTemplates([]);
    }
  }, []);

  /** 打开时加载列表 */
  const handleOpen = useCallback((visible: boolean) => {
    if (visible) loadTemplates();
  }, [loadTemplates]);

  /** 加载模板到画布 */
  const handleLoad = useCallback((template: ITemplate) => {
    loadFromJSON(template);
    message.success(`已加载模板: ${template.name}`);
    onClose();
  }, [loadFromJSON, onClose]);

  /** 删除模板 */
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await templateApi.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  }, []);

  /** 导出当前模板为 JSON */
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

  /** 导入本地 JSON 模板 */
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
        loadFromJSON(template);
        message.success(`已导入模板: ${template.name}`);
        onClose();
      } catch {
        message.error('JSON 解析失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [loadFromJSON, onClose]);

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
      afterOpenChange={handleOpen}
    >
      <input
        ref={importRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      {templates.length === 0 ? (
        <div className="empty-state">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无已保存的模板"
          >
            <p style={{ fontSize: 12, color: '#8c8c8c' }}>
              点击"导出当前"保存当前画布为模板，或"导入 JSON"加载本地模板文件
            </p>
          </Empty>
        </div>
      ) : (
        <div className="template-list">
          {templates.map((t) => (
            <div key={t.id} className="template-item" onClick={() => handleLoad(t)}>
              <div className="info">
                <div className="name">{t.name}</div>
                <div className="meta">
                  {t.pages?.length || 0} 页 · {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ''}
                </div>
              </div>
              <div className="actions">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => handleDelete(t.id, e)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default TemplateManager;
