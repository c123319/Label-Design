import { useState, useCallback, useRef } from 'react';
import { Modal, Button, Progress, Alert, List, Input, message } from 'antd';
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
  const [progressDetail, setProgressDetail] = useState<{ current: number; total: number } | null>(null);
  const [fileNameTemplate, setFileNameTemplate] = useState('');
  const [validation, setValidation] = useState<ReturnType<typeof validateBindings> | null>(null);
  const [useCloud, setUseCloud] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const handleCancelGenerate = () => {
    abortRef.current?.abort();
  };

  const handleGenerateLocal = async () => {
    const result = runValidation();
    if (!result?.valid || !canvas || !dataSource) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setProgress(0);
    setProgressDetail(null);

    try {
      const exportPages = syncCurrentPage();
      const totalImages = dataSource.rows.length * exportPages.length;
      const { success, failed, cancelled } = await batchExportZip(canvas, {
        pages: exportPages,
        rows: dataSource.rows,
        fileNamePrefix: templateName || 'label',
        fileNameTemplate: fileNameTemplate.trim() || undefined,
        signal: controller.signal,
        onProgress: (cur, total) => {
          setProgress(Math.round((cur / total) * 100));
          setProgressDetail({ current: cur, total });
        },
      });

      if (cancelled) {
        message.info(`已取消导出（已完成 ${success} 张）`);
      } else {
        message.success(
          `ZIP 导出完成：成功 ${success} 张${failed > 0 ? `，失败 ${failed} 张` : ''}（共 ${totalImages} 张）`,
        );
        onClose();
      }
    } catch {
      message.error('批量生成失败');
    } finally {
      abortRef.current = null;
      setGenerating(false);
      setProgress(0);
      setProgressDetail(null);
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

  const handleModalClose = () => {
    if (generating) {
      handleCancelGenerate();
      return;
    }
    onClose();
  };

  return (
    <Modal
      title="批量生成"
      open={open}
      onCancel={handleModalClose}
      className="batch-generate-modal"
      width={520}
      footer={[
        generating ? (
          <Button key="cancel-gen" danger onClick={handleCancelGenerate}>
            停止导出
          </Button>
        ) : (
          <Button key="cancel" onClick={onClose}>取消</Button>
        ),
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
            message={`数据源：${dataSource.fileName || '本地数据'}，共 ${dataSource.totalRows} 条${pages.length > 1 ? `，${pages.length} 页模板` : ''}`}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert type="warning" showIcon message="尚未上传数据源" style={{ marginBottom: 16 }} />
        )}

        <div className="batch-filename-field">
          <label htmlFor="batch-filename-template">文件命名（可选）</label>
          <Input
            id="batch-filename-template"
            placeholder="{{字段名}}_标签，留空则使用模板名_001"
            value={fileNameTemplate}
            onChange={(e) => setFileNameTemplate(e.target.value)}
            disabled={generating}
            size="small"
          />
        </div>

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
            <span>
              {progressDetail
                ? `正在生成第 ${progressDetail.current} / ${progressDetail.total} 张…`
                : `正在生成… ${progress}%`}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BatchGenerate;
