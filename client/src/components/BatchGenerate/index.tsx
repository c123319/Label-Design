import { useState, useCallback } from 'react';
import { Modal, Button, Progress, Alert, List, message } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { validateBindings } from '@/utils/renderTemplate';
import { batchExportZip } from '@/utils/batchExport';
import { renderJobApi } from '@/services/api';
import './styles.css';

interface BatchGenerateProps {
  open: boolean;
  onClose: () => void;
}

const BatchGenerate: React.FC<BatchGenerateProps> = ({ open, onClose }) => {
  const { canvas, dataSource, templateName, templateSize, pages, currentPageIndex, currentTemplateId } =
    useEditorStore();

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validation, setValidation] = useState<ReturnType<typeof validateBindings> | null>(null);
  const [useCloud, setUseCloud] = useState(false);

  const runValidation = useCallback(() => {
    if (!canvas || !dataSource) {
      message.warning('请先上传数据源');
      return null;
    }
    const result = validateBindings(canvas, dataSource.fields, dataSource.rows);
    setValidation(result);
    return result;
  }, [canvas, dataSource]);

  const handleValidate = () => {
    const result = runValidation();
    if (result?.valid) message.success('校验通过，可以批量生成');
    else if (result) message.error('校验未通过，请修正后重试');
  };

  const syncCurrentPage = () => {
    if (!canvas) return pages;
    const json = canvas.toJSON();
    const updated = [...pages];
    updated[currentPageIndex] = {
      width: templateSize.width,
      height: templateSize.height,
      background: pages[currentPageIndex]?.background || '#ffffff',
      objects: (json.objects || []) as typeof updated[0]['objects'],
    };
    useEditorStore.setState({ pages: updated });
    return updated;
  };

  const handleGenerateLocal = async () => {
    const result = runValidation();
    if (!result?.valid || !canvas || !dataSource) return;

    setGenerating(true);
    setProgress(0);
    try {
      const exportPages = syncCurrentPage();
      const totalImages = dataSource.rows.length * exportPages.length;
      const { success, failed } = await batchExportZip(canvas, {
        pages: exportPages,
        rows: dataSource.rows,
        fileNamePrefix: templateName || 'label',
        onProgress: (cur, total) => setProgress(Math.round((cur / total) * 100)),
      });
      message.success(
        `ZIP 导出完成：成功 ${success} 张${failed > 0 ? `，失败 ${failed} 张` : ''}（共 ${totalImages} 张）`,
      );
      onClose();
    } catch {
      message.error('批量生成失败');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const handleGenerateCloud = async () => {
    const result = runValidation();
    if (!result?.valid || !dataSource) return;

    setGenerating(true);
    setProgress(0);
    try {
      const res = await renderJobApi.create({
        templateId: currentTemplateId || 'local',
        dataSourceId: dataSource.id,
        outputType: 'PNG',
        range: { type: 'all' },
      });
      const jobId = (res as { data?: { jobId: string } }).data?.jobId
        ?? (res as { jobId?: string }).jobId;
      if (!jobId) throw new Error('no job id');

      let done = false;
      while (!done) {
        await new Promise((r) => setTimeout(r, 1000));
        const statusRes = await renderJobApi.getStatus(jobId) as {
          data?: { progress?: number; status?: string; downloadUrl?: string | null };
          progress?: number;
          status?: string;
          downloadUrl?: string | null;
        };
        const job = statusRes.data ?? statusRes;
        setProgress(Number(job.progress) || 0);
        if (job.status === 'COMPLETED') {
          done = true;
          if (job.downloadUrl) {
            window.open(job.downloadUrl, '_blank');
          }
          message.success('批量生成完成');
          onClose();
        } else if (job.status === 'FAILED') {
          throw new Error('任务失败');
        }
      }
    } catch {
      message.error('云端批量生成失败，请使用本地下载');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title="批量生成"
      open={open}
      onCancel={onClose}
      className="batch-generate-modal"
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={generating}>取消</Button>,
        <Button key="validate" onClick={handleValidate} disabled={generating || !dataSource}>
          校验
        </Button>,
        <Button
          key="local"
          type="primary"
          loading={generating && !useCloud}
          disabled={!dataSource || generating}
          onClick={() => { setUseCloud(false); handleGenerateLocal(); }}
        >
          下载 ZIP
        </Button>,
        <Button
          key="cloud"
          loading={generating && useCloud}
          disabled={!dataSource || generating}
          onClick={() => { setUseCloud(true); handleGenerateCloud(); }}
        >
          云端生成
        </Button>,
      ]}
    >
      <div className="batch-generate-body">
        <p className="batch-desc">
          将按数据源每一行渲染标签，多页模板会导出全部页面，打包为单个 ZIP 下载。生成前会自动校验占位符与字段是否匹配。
        </p>

        {dataSource ? (
          <Alert
            type="info"
            showIcon
            message={`数据源：${dataSource.fileName || '本地数据'}，共 ${dataSource.totalRows} 条`}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert type="warning" showIcon message="尚未上传数据源" style={{ marginBottom: 16 }} />
        )}

        {validation && (
          <div className="validation-result">
            {validation.errors.length > 0 && (
              <Alert
                type="error"
                message="错误"
                description={
                  <List
                    size="small"
                    dataSource={validation.errors}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                }
                style={{ marginBottom: 8 }}
              />
            )}
            {validation.warnings.length > 0 && (
              <Alert
                type="warning"
                message="警告"
                description={
                  <List
                    size="small"
                    dataSource={validation.warnings.slice(0, 5)}
                    renderItem={(item) => <List.Item>{item}</List.Item>}
                  />
                }
              />
            )}
            {validation.valid && validation.warnings.length === 0 && (
              <Alert type="success" message="校验通过" icon={<ThunderboltOutlined />} />
            )}
          </div>
        )}

        {generating && (
          <div className="batch-progress">
            <Progress percent={progress} status="active" />
            <span>正在生成… {progress}%</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BatchGenerate;
