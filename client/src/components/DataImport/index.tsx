import { useState, useCallback, useMemo } from 'react';
import { Modal, Upload, Table, Tag, Button, message, Alert, Tooltip } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import {
  buildFieldsFromColumns,
  validateUploadData,
  collectCanvasPlaceholders,
  truncateText,
} from '@/utils/renderTemplate';
import type { IDataSource } from '@shared/types/datasource';
import type { IApiResponse } from '@shared/types/api';
import { dataSourceApi } from '@/services/api';
import * as XLSX from 'xlsx';
import './styles.css';

const { Dragger } = Upload;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface DataImportProps {
  open: boolean;
  onClose: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ open, onClose }) => {
  const { canvas, setDataSource, currentTemplateId } = useEditorStore();

  const [rawData, setRawData] = useState<Record<string, string | number>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<IDataSource['fileType']>('xlsx');
  const [uploadValidation, setUploadValidation] = useState<{
    errors: string[];
    warnings: string[];
  } | null>(null);

  const placeholders = useMemo(() => {
    if (!canvas) return [];
    return collectCanvasPlaceholders(canvas);
  }, [canvas, rawData]);

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过 20MB');
      return false;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'json'].includes(ext ?? '')) {
      message.error('仅支持 xlsx、csv、json 格式');
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      let parsed: Record<string, string | number>[] = [];

      try {
        if (ext === 'json') {
          parsed = JSON.parse(data as string);
          if (!Array.isArray(parsed)) {
            message.error('JSON 文件需要是数组格式');
            return;
          }
          setFileType('json');
        } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          parsed = XLSX.utils.sheet_to_json(sheet) as Record<string, string | number>[];
          setFileType(ext === 'csv' ? 'csv' : 'xlsx');
        }

        const cols = parsed.length > 0 ? Object.keys(parsed[0]) : [];
        const validation = validateUploadData(cols, parsed);
        setUploadValidation({ errors: validation.errors, warnings: validation.warnings });

        if (!validation.valid) {
          message.error(validation.errors[0]);
          return;
        }

        setRawData(parsed);
        setColumns(cols);
        setFileName(file.name);
        message.success(`成功解析 ${parsed.length} 条数据，${cols.length} 个字段`);
      } catch {
        message.error('文件解析失败');
      }
    };

    if (ext === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    return false;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (rawData.length === 0) return;

    const fields = buildFieldsFromColumns(columns, rawData[0]);
    let dataSourceId = `ds_local_${Date.now()}`;

    if (currentTemplateId) {
      try {
        const res = await dataSourceApi.upload(fileName, rawData, currentTemplateId) as
          | IApiResponse<IDataSource>
          | IDataSource;
        const serverDs = 'data' in res && res.data ? res.data : (res as IDataSource);
        if (serverDs?.id) dataSourceId = serverDs.id;
      } catch {
        message.warning('数据源已绑定本地，云端同步失败');
      }
    }

    const dataSource: IDataSource = {
      id: dataSourceId,
      fileName,
      fileType,
      fields,
      previewRows: rawData.slice(0, 10),
      totalRows: rawData.length,
      rows: rawData,
    };

    setDataSource(dataSource);
    useEditorStore.getState().setImportedData(rawData);

    message.success(`已绑定数据源：${rawData.length} 条`);
    onClose();
  }, [rawData, columns, fileName, fileType, setDataSource, currentTemplateId, onClose]);

  const tableColumns = useMemo(
    () =>
      columns.slice(0, 8).map((col) => ({
        title: col,
        dataIndex: col,
        key: col,
        ellipsis: true,
        width: 120,
      })),
    [columns],
  );

  const fieldList = buildFieldsFromColumns(columns, rawData[0]);

  return (
    <Modal
      title="数据绑定 — 上传数据源"
      open={open}
      onCancel={onClose}
      className="data-import-modal"
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button
          key="confirm"
          type="primary"
          disabled={rawData.length === 0 || (uploadValidation?.errors.length ?? 0) > 0}
          onClick={handleConfirm}
        >
          确认绑定 ({rawData.length} 条)
        </Button>,
      ]}
    >
      <div className="upload-area">
        <Dragger
          accept=".csv,.xlsx,.xls,.json"
          showUploadList={false}
          beforeUpload={handleFile}
          multiple={false}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p>点击或拖拽文件到此处上传</p>
          <p style={{ color: '#8c8c8c', fontSize: 12 }}>
            支持 CSV、Excel (.xlsx/.xls)、JSON，最大 20MB。第一行须为字段名。
          </p>
        </Dragger>
      </div>

      {uploadValidation && uploadValidation.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={uploadValidation.warnings.join('；')}
        />
      )}

      {placeholders.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              模板中发现 <strong>{placeholders.length}</strong> 个占位符：
              {placeholders.map((p) => (
                <Tag key={p} color="blue" style={{ marginLeft: 4 }}>{'{{' + p + '}}'}</Tag>
              ))}
            </span>
          }
        />
      )}

      {columns.length > 0 && (
        <div className="field-list-section">
          <h4>字段列表（{columns.length} 个）</h4>
          <div className="field-tags">
            {fieldList.map((f) => {
              const sampleShort = f.sampleValue ? truncateText(String(f.sampleValue), 18) : '';
              const tag = (
                <Tag className="field-tag">
                  <span className="field-tag-name">{f.fieldName}</span>
                  {sampleShort && <span className="field-sample"> ({sampleShort})</span>}
                </Tag>
              );
              return (
                <span key={f.fieldCode} className="field-tag-wrap">
                  {f.sampleValue && String(f.sampleValue).length > 18 ? (
                    <Tooltip title={`示例: ${f.sampleValue}`}>{tag}</Tooltip>
                  ) : (
                    tag
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {rawData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>数据预览（前 {Math.min(rawData.length, 10)} 条，共 {rawData.length} 条）</h4>
          <Table
            size="small"
            scroll={{ x: 'max-content' }}
            columns={tableColumns}
            dataSource={rawData.slice(0, 10).map((row, i) => ({ ...row, _key: i }))}
            rowKey="_key"
            pagination={false}
            bordered
          />
        </div>
      )}
    </Modal>
  );
};

export default DataImport;
