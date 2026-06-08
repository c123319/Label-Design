import { useState, useCallback, useMemo } from 'react';
import { Modal, Upload, Table, Select, Tag, Button, message, Alert } from 'antd';
import { InboxOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import * as XLSX from 'xlsx';
import './styles.css';

const { Dragger } = Upload;

interface DataImportProps {
  open: boolean;
  onClose: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ open, onClose }) => {
  const { importedData, setImportedData, fieldMapping, setFieldMapping, canvas } =
    useEditorStore();

  const [rawData, setRawData] = useState<Record<string, string | number>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  /** 从画布中提取占位符 */
  const placeholders = useMemo(() => {
    if (!canvas) return [];
    const objs = canvas.getObjects();
    const phSet = new Set<string>();
    objs.forEach((obj: any) => {
      const text = obj.text as string | undefined;
      if (text) {
        const matches = text.match(/\{\{(\w+)\}\}/g);
        if (matches) {
          matches.forEach((m) => {
            phSet.add(m.replace(/\{\{|\}\}/g, ''));
          });
        }
      }
    });
    return Array.from(phSet);
  }, [canvas, rawData]); // rawData changes trigger re-scan

  /** 处理文件上传 */
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      let parsed: Record<string, string | number>[] = [];

      if (ext === 'json') {
        parsed = JSON.parse(data as string);
        if (!Array.isArray(parsed)) {
          message.error('JSON 文件需要是数组格式');
          return;
        }
      } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsed = XLSX.utils.sheet_to_json(sheet);
      } else {
        message.error(`不支持的格式: .${ext}`);
        return;
      }

      if (parsed.length === 0) {
        message.error('文件中没有数据');
        return;
      }

      const cols = Object.keys(parsed[0]);
      setRawData(parsed);
      setColumns(cols);
      // 自动映射同名字段
      const autoMapping: Record<string, string> = {};
      cols.forEach((col) => {
        if (placeholders.includes(col)) {
          autoMapping[col] = col;
        }
      });
      setFieldMapping(autoMapping);
      message.success(`成功解析 ${parsed.length} 条数据，${cols.length} 个字段`);
    };

    if (ext === 'json') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    return false; // 阻止默认上传行为
  }, [placeholders, setFieldMapping]);

  /** 确认导入 */
  const handleConfirm = useCallback(() => {
    setImportedData(rawData);
    message.success(`已导入 ${rawData.length} 条数据`);
    onClose();
  }, [rawData, setImportedData, onClose]);

  /** 预览表格列定义 */
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

  return (
    <Modal
      title="批量数据导入"
      open={open}
      onCancel={onClose}
      className="data-import-modal"
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          disabled={rawData.length === 0}
          onClick={handleConfirm}
        >
          确认导入 ({rawData.length} 条)
        </Button>,
      ]}
    >
      {/* 上传区域 */}
      <div className="upload-area">
        <Dragger
          accept=".csv,.xlsx,.xls,.json"
          showUploadList={false}
          beforeUpload={handleFile}
          multiple={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p>点击或拖拽文件到此处上传</p>
          <p style={{ color: '#8c8c8c', fontSize: 12 }}>支持 CSV、Excel (.xlsx/.xls)、JSON 格式</p>
        </Dragger>
      </div>

      {/* 占位符提示 */}
      {placeholders.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              模板中发现 <strong>{placeholders.length}</strong> 个占位符：
              {placeholders.map((p) => (
                <Tag key={p} color="blue" style={{ marginLeft: 4 }}>
                  {'{{' + p + '}}'}
                </Tag>
              ))}
            </span>
          }
        />
      )}

      {/* 字段映射 */}
      {columns.length > 0 && placeholders.length > 0 && (
        <div className="field-mapping">
          <h4 style={{ marginBottom: 8 }}>字段映射</h4>
          {placeholders.map((ph) => (
            <div key={ph} className="mapping-row">
              <Tag color="blue">{'{{' + ph + '}}'}</Tag>
              <ArrowRightOutlined className="mapping-arrow" />
              <Select
                size="small"
                style={{ width: 180 }}
                placeholder="选择数据字段"
                value={fieldMapping[ph] || undefined}
                onChange={(v) => {
                  const newMapping = { ...fieldMapping, [ph]: v };
                  setFieldMapping(newMapping);
                }}
                allowClear
                options={columns.map((col) => ({ value: col, label: col }))}
              />
            </div>
          ))}
        </div>
      )}

      {/* 数据预览 */}
      {rawData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>
            数据预览（前 {Math.min(rawData.length, 10)} 条，共 {rawData.length} 条）
          </h4>
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
