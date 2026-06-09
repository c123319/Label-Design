import { useCallback, useMemo } from 'react';
import { Select, Input, Button, Tag, Switch, Alert } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import {
  extractPlaceholders,
  getPreviewValue,
  type FabricCustomObject,
} from '@/utils/renderTemplate';
import type { IElementBinding } from '@shared/types/datasource';

interface DataBindingPanelProps {
  activeObject: fabric.Object | null;
  onOpenDataImport?: () => void;
}

const DataBindingPanel: React.FC<DataBindingPanelProps> = ({ activeObject, onOpenDataImport }) => {
  const { canvas, dataSource, currentPreviewIndex, saveHistory } = useEditorStore();

  const currentRow = dataSource?.rows[currentPreviewIndex];

  const fieldOptions = useMemo(
    () =>
      (dataSource?.fields ?? []).map((f) => ({
        value: f.fieldCode,
        label: `${f.fieldName} (${f.fieldCode})`,
      })),
    [dataSource?.fields],
  );

  const updateObjectBinding = useCallback(
    (updates: Partial<IElementBinding> & Record<string, unknown>) => {
      if (!activeObject || !canvas) return;
      const custom = activeObject as FabricCustomObject;
      const binding: IElementBinding = {
        enabled: true,
        type: 'templateText',
        ...custom.binding,
        ...updates,
      };
      (activeObject as fabric.Object & { binding?: IElementBinding }).binding = binding;
      Object.entries(updates).forEach(([k, v]) => {
        if (k !== 'enabled' && k !== 'type' && k !== 'fieldCode' && k !== 'fields' && k !== 'template' && k !== 'defaultValue') {
          (activeObject as unknown as Record<string, unknown>)[k] = v;
        }
      });
      canvas.requestRenderAll();
      saveHistory();
    },
    [activeObject, canvas, saveHistory],
  );

  const insertField = useCallback(
    (fieldCode: string) => {
      if (!activeObject || !canvas) return;
      const placeholder = `{{${fieldCode}}}`;
      const custom = activeObject as FabricCustomObject;

      if (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox') {
        const textObj = activeObject as fabric.IText;
        const newText = (textObj.text ?? '') + placeholder;
        textObj.set('text', newText);
        updateObjectBinding({
          type: 'templateText',
          template: newText,
          fields: extractPlaceholders(newText),
        });
      } else if (custom.elementType === 'barcode') {
        (activeObject as FabricCustomObject).barcodeValue = placeholder;
        updateObjectBinding({ type: 'singleField', fieldCode });
      } else if (custom.elementType === 'qrcode') {
        (activeObject as FabricCustomObject).qrValue = placeholder;
        updateObjectBinding({ type: 'singleField', fieldCode });
      }
      canvas.requestRenderAll();
      saveHistory();
    },
    [activeObject, canvas, saveHistory, updateObjectBinding],
  );

  const renderDataSourceSection = () => (
    <div className="panel-section">
      <div className="section-title">数据源</div>
      {!dataSource ? (
        <div className="data-binding-empty">
          <p>暂无数据源</p>
          <p style={{ fontSize: 12 }}>上传 Excel 或 CSV 后，可在此绑定字段。</p>
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            style={{ marginTop: 12 }}
            onClick={onOpenDataImport}
          >
            上传数据
          </Button>
        </div>
      ) : (
        <>
          <div className="prop-row">
            <span className="prop-label">文件</span>
            <div className="prop-field">
              <span style={{ fontSize: 12 }}>{dataSource.fileName || '本地数据'}</span>
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">数据量</span>
            <div className="prop-field">
              <Tag color="blue">{dataSource.totalRows} 条</Tag>
            </div>
          </div>
          <div className="binding-field-list">
            <div className="binding-field-list-title">可用字段</div>
            {dataSource.fields.map((f) => (
              <div key={f.fieldCode} className="binding-field-item">
                <span className="binding-field-name">{f.fieldName}</span>
                <code className="binding-field-code">{f.fieldCode}</code>
                {activeObject && (
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => insertField(f.fieldCode)}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (!activeObject) {
    return renderDataSourceSection();
  }

  const custom = activeObject as FabricCustomObject;
  const isText = activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox';
  const isBarcode = custom.elementType === 'barcode';
  const isQrcode = custom.elementType === 'qrcode';

  if (!isText && !isBarcode && !isQrcode) {
    return (
      <>
        {renderDataSourceSection()}
        <div className="data-binding-empty">
          <p>当前元素不支持数据绑定</p>
          <p style={{ fontSize: 12 }}>请选中文本、条码或二维码元素。</p>
        </div>
      </>
    );
  }

  if (!dataSource) {
    return (
      <>
        {renderDataSourceSection()}
        <Alert type="warning" message="请先上传数据源" style={{ margin: 16 }} />
      </>
    );
  }

  if (isText) {
    const textObj = activeObject as fabric.IText;
    const template = textObj.text ?? '';
    const preview = getPreviewValue(template, currentRow, custom.binding?.defaultValue);

    return (
      <>
        {renderDataSourceSection()}
        <div className="panel-section">
          <div className="section-title">文本绑定</div>
          <div className="prop-row">
            <span className="prop-label">插入字段</span>
            <div className="prop-field">
              <Select
                size="small"
                placeholder="选择字段插入"
                style={{ width: '100%' }}
                options={fieldOptions}
                onChange={(v) => v && insertField(v)}
                value={null}
              />
            </div>
          </div>
          <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="prop-label" style={{ marginBottom: 4 }}>内容模板</span>
            <Input.TextArea
              size="small"
              value={template}
              rows={3}
              onChange={(e) => {
                const newText = e.target.value;
                textObj.set('text', newText);
                updateObjectBinding({
                  type: 'templateText',
                  template: newText,
                  fields: extractPlaceholders(newText),
                });
              }}
              placeholder="产品名称：{{productName}}"
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">默认值</span>
            <div className="prop-field">
              <Input
                size="small"
                placeholder="暂无数据时显示"
                value={custom.binding?.defaultValue ?? ''}
                onChange={(e) => updateObjectBinding({ defaultValue: e.target.value })}
              />
            </div>
          </div>
          <div className="binding-preview-box">
            <div className="binding-preview-label">预览值</div>
            <div className="binding-preview-value">{preview || '—'}</div>
          </div>
        </div>
      </>
    );
  }

  if (isBarcode) {
    const template = custom.barcodeValue ?? '';
    const preview = getPreviewValue(template, currentRow);

    return (
      <>
        {renderDataSourceSection()}
        <div className="panel-section">
          <div className="section-title">条码绑定</div>
          <div className="prop-row">
            <span className="prop-label">绑定字段</span>
            <div className="prop-field">
              <Select
                size="small"
                style={{ width: '100%' }}
                placeholder="选择字段"
                options={fieldOptions}
                value={custom.binding?.fieldCode}
                onChange={(v) => {
                  const placeholder = `{{${v}}}`;
                  (activeObject as FabricCustomObject).barcodeValue = placeholder;
                  updateObjectBinding({ type: 'singleField', fieldCode: v });
                }}
                allowClear
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">条码类型</span>
            <div className="prop-field">
              <Select
                size="small"
                style={{ width: '100%' }}
                value={custom.barcodeFormat || 'CODE128'}
                options={[
                  { value: 'CODE128', label: 'Code128' },
                  { value: 'CODE39', label: 'Code39' },
                  { value: 'EAN13', label: 'EAN13' },
                ]}
                onChange={(v) => { (activeObject as FabricCustomObject).barcodeFormat = v; }}
              />
            </div>
          </div>
          <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="prop-label" style={{ marginBottom: 4 }}>条码内容</span>
            <Input
              size="small"
              value={template}
              onChange={(e) => {
                (activeObject as FabricCustomObject).barcodeValue = e.target.value;
                updateObjectBinding({
                  type: 'templateText',
                  template: e.target.value,
                  fields: extractPlaceholders(e.target.value),
                });
              }}
            />
          </div>
          <div className="binding-preview-box">
            <div className="binding-preview-label">预览值</div>
            <div className="binding-preview-value">{preview || '—'}</div>
          </div>
        </div>
      </>
    );
  }

  if (isQrcode) {
    const template = custom.qrValue ?? '';
    const isMulti = extractPlaceholders(template).length > 1;
    const preview = getPreviewValue(template, currentRow);

    return (
      <>
        {renderDataSourceSection()}
        <div className="panel-section">
          <div className="section-title">二维码绑定</div>
          <div className="prop-row">
            <span className="prop-label">模式</span>
            <div className="prop-field">
              <Switch
                size="small"
                checkedChildren="多字段"
                unCheckedChildren="单字段"
                checked={isMulti}
                onChange={(checked) => {
                  if (!checked && fieldOptions[0]) {
                    const v = fieldOptions[0].value;
                    const placeholder = `{{${v}}}`;
                    (activeObject as FabricCustomObject).qrValue = placeholder;
                    updateObjectBinding({ type: 'singleField', fieldCode: v });
                  }
                }}
              />
            </div>
          </div>
          {!isMulti && (
            <div className="prop-row">
              <span className="prop-label">绑定字段</span>
              <div className="prop-field">
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  placeholder="选择字段"
                  options={fieldOptions}
                  value={custom.binding?.fieldCode}
                  onChange={(v) => {
                    const placeholder = `{{${v}}}`;
                    (activeObject as FabricCustomObject).qrValue = placeholder;
                    updateObjectBinding({ type: 'singleField', fieldCode: v });
                  }}
                />
              </div>
            </div>
          )}
          <div className="prop-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span className="prop-label" style={{ marginBottom: 4 }}>内容模板</span>
            <Input.TextArea
              size="small"
              value={template}
              rows={4}
              onChange={(e) => {
                (activeObject as FabricCustomObject).qrValue = e.target.value;
                updateObjectBinding({
                  type: 'templateText',
                  template: e.target.value,
                  fields: extractPlaceholders(e.target.value),
                });
              }}
              placeholder={'产品：{{productName}}\n型号：{{spec}}'}
            />
          </div>
          <div className="binding-preview-box">
            <div className="binding-preview-label">预览值</div>
            <div className="binding-preview-value" style={{ whiteSpace: 'pre-wrap' }}>{preview || '—'}</div>
          </div>
        </div>
      </>
    );
  }

  return null;
};

export default DataBindingPanel;
