import { Button, InputNumber, Space, Tag } from 'antd';
import { LeftOutlined, RightOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

const DataPreview: React.FC = () => {
  const {
    dataSource,
    currentPreviewIndex,
    previewMode,
    enterPreviewMode,
    exitPreviewMode,
    previewNext,
    previewPrev,
    applyPreviewRow,
  } = useEditorStore();

  if (!dataSource || dataSource.totalRows === 0) return null;

  const currentRow = dataSource.rows[currentPreviewIndex];
  const fieldPreview = dataSource.fields.slice(0, 4);

  return (
    <div className={`data-preview-bar ${previewMode ? 'active' : ''}`}>
      <div className="data-preview-left">
        {previewMode ? (
          <Tag color="blue">预览模式</Tag>
        ) : (
          <span className="data-preview-hint">已加载 {dataSource.totalRows} 条数据</span>
        )}
        {previewMode && (
          <span className="data-preview-index">
            第 {currentPreviewIndex + 1} / {dataSource.totalRows} 条
          </span>
        )}
      </div>

      {previewMode && currentRow && (
        <div className="data-preview-fields">
          {fieldPreview.map((f) => (
            <span key={f.fieldCode} className="data-preview-field">
              <strong>{f.fieldName}:</strong> {String(currentRow[f.fieldCode] ?? '—')}
            </span>
          ))}
        </div>
      )}

      <div className="data-preview-actions">
        {previewMode ? (
          <Space size={8}>
            <Button size="small" icon={<LeftOutlined />} onClick={previewPrev} disabled={currentPreviewIndex <= 0}>
              上一条
            </Button>
            <InputNumber
              size="small"
              min={1}
              max={dataSource.totalRows}
              value={currentPreviewIndex + 1}
              onChange={(v) => v && applyPreviewRow(v - 1)}
              style={{ width: 72 }}
            />
            <Button
              size="small"
              icon={<RightOutlined />}
              onClick={previewNext}
              disabled={currentPreviewIndex >= dataSource.totalRows - 1}
            >
              下一条
            </Button>
            <Button size="small" icon={<CloseOutlined />} onClick={exitPreviewMode}>
              退出预览
            </Button>
          </Space>
        ) : (
          <Button size="small" type="primary" icon={<EyeOutlined />} onClick={enterPreviewMode}>
            预览数据
          </Button>
        )}
      </div>
    </div>
  );
};

export default DataPreview;
