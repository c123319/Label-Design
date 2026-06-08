/**
 * 模板相关类型定义
 */

/** 模板中的元素类型 */
export type TemplateObjectType = 'text' | 'image' | 'qrcode' | 'barcode' | 'rect' | 'circle' | 'line';

/** 基础模板元素 */
export interface ITemplateObject {
  type: TemplateObjectType;
  left: number;
  top: number;
  width?: number;
  height?: number;
  angle?: number;
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** 文字元素 */
export interface ITextObject extends ITemplateObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  shadow?: string;
}

/** 二维码元素 */
export interface IQrCodeObject extends ITemplateObject {
  type: 'qrcode';
  value: string;
  size: number;
}

/** 条形码元素 */
export interface IBarcodeObject extends ITemplateObject {
  type: 'barcode';
  value: string;
  format?: string;
  width: number;
  height: number;
}

/** 图片元素 */
export interface IImageObject extends ITemplateObject {
  type: 'image';
  src: string;
  scaleX?: number;
  scaleY?: number;
}

/** 所有元素类型联合 */
export type TemplateElement = ITextObject | IQrCodeObject | IBarcodeObject | IImageObject | ITemplateObject;

/** 模板页面 */
export interface ITemplatePage {
  width: number;
  height: number;
  background?: string;
  backgroundImage?: string;
  objects: TemplateElement[];
}

/** 完整模板 */
export interface ITemplate {
  id: string;
  name: string;
  description?: string;
  pages: ITemplatePage[];
  createdAt: string;
  updatedAt: string;
}
