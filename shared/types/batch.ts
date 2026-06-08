/**
 * 批量任务相关类型定义
 */

/** 批量任务状态 */
export type BatchJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 批量任务 */
export interface IBatchJob {
  jobId: string;
  templateId: string;
  status: BatchJobStatus;
  total: number;
  completed: number;
  failed: number;
  resultUrl: string | null;
  error?: string;
  createdAt: string;
}

/** 批量数据行 */
export interface IBatchDataRow {
  [key: string]: string | number;
}

/** 批量生成请求 */
export interface IBatchGenerateRequest {
  templateId: string;
  data: IBatchDataRow[];
  exportFormat?: 'png' | 'jpg' | 'pdf';
}

/** 批量生成响应 */
export interface IBatchGenerateResponse {
  jobId: string;
}

/** 批量状态查询响应 */
export interface IBatchStatusResponse {
  jobId: string;
  status: BatchJobStatus;
  total: number;
  completed: number;
  failed: number;
  resultUrl: string | null;
}
