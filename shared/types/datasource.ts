/**
 * 数据源与元素绑定类型定义
 */

/** 字段类型 */
export type FieldType = 'text' | 'number' | 'date' | 'image' | 'barcode' | 'qrcode' | 'enum' | 'boolean';

/** 数据字段 */
export interface IDataField {
  fieldCode: string;
  fieldName: string;
  fieldType: FieldType;
  required?: boolean;
  defaultValue?: string;
  sampleValue?: string;
}

/** 数据源 */
export interface IDataSource {
  id: string;
  fileName?: string;
  fileType?: 'xlsx' | 'csv' | 'json' | 'manual';
  fields: IDataField[];
  previewRows: Record<string, string | number>[];
  totalRows: number;
  rows: Record<string, string | number>[];
}

/** 元素绑定类型 */
export type BindingType = 'singleField' | 'templateText';

/** 元素绑定配置 */
export interface IElementBinding {
  enabled: boolean;
  type: BindingType;
  fieldCode?: string;
  template?: string;
  fields?: string[];
  defaultValue?: string;
}

/** 绑定校验结果 */
export interface IBindingValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** 渲染任务状态 */
export type RenderJobStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** 渲染任务 */
export interface IRenderJob {
  jobId: string;
  status: RenderJobStatus;
  total: number;
  success: number;
  failed: number;
  progress: number;
  errors?: { rowIndex: number; message: string }[];
  downloadUrl: string | null;
}
