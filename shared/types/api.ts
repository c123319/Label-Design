/**
 * API 接口类型定义
 */

/** 通用 API 响应 */
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 分页请求 */
export interface IPaginationRequest {
  page: number;
  pageSize: number;
}

/** 分页响应 */
export interface IPaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 文件上传响应 */
export interface IUploadResponse {
  fileId: string;
  filename: string;
  size: number;
}

/** 模板列表查询参数 */
export interface ITemplateQueryParams extends IPaginationRequest {
  keyword?: string;
}
