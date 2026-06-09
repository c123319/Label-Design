/**
 * 远程模板库 (template-store) 类型定义
 */

/** 模板库清单 */
export interface ITemplateStoreManifest {
  version: string;
  templates: ITemplateStoreEntry[];
}

/** 清单中的模板条目 */
export interface ITemplateStoreEntry {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  width: number;
  height: number;
  unit: 'mm' | 'px';
  thumbnail: string;
  templateUrl: string;
  tags?: string[];
  featured?: boolean;
  sort?: number;
  version?: string;
}

/** 分类 */
export interface ITemplateCategory {
  code: string;
  name: string;
}

/** template-store 模板 JSON 中的画布配置 */
export interface IStoreCanvas {
  width: number;
  height: number;
  unit: 'mm' | 'px';
  background?: string;
  gridSize?: number;
  showGrid?: boolean;
}

/** 元素样式 */
export interface IStoreObjectStyle {
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
}

/** 元素绑定 */
export interface IStoreObjectBinding {
  enabled: boolean;
  fieldCode?: string;
  fields?: string[];
  template?: string;
  defaultValue?: string;
}

/** template-store 模板元素 */
export interface IStoreTemplateObject {
  id: string;
  type: 'text' | 'barcode' | 'qrcode' | 'image' | 'rect' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  content?: string;
  value?: string;
  src?: string;
  barcodeType?: string;
  showText?: boolean;
  style?: IStoreObjectStyle;
  binding?: IStoreObjectBinding;
}

/** template-store 模板 JSON 文件 */
export interface IStoreTemplateFile {
  schemaVersion: string;
  templateId: string;
  name: string;
  category?: string;
  canvas: IStoreCanvas;
  objects: IStoreTemplateObject[];
}
