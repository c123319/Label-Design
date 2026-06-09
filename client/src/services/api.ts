import axios from 'axios';
import type { ITemplate } from '@shared/types/template';
import type { IApiResponse } from '@shared/types/api';
import type { IDataSource, IRenderJob } from '@shared/types/datasource';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  },
);

// ── 模板 CRUD ──
export const templateApi = {
  create: (data: Partial<ITemplate>) =>
    api.post<unknown, IApiResponse<{ id: string }>>('/templates', data),

  list: () =>
    api.get<unknown, IApiResponse<ITemplate[]>>('/templates'),

  get: (id: string) =>
    api.get<unknown, ITemplate>(`/templates/${id}`),

  update: (id: string, data: Partial<ITemplate>) =>
    api.put<unknown, IApiResponse<ITemplate>>(`/templates/${id}`, data),

  delete: (id: string) =>
    api.delete<unknown, IApiResponse<{ success: boolean }>>(`/templates/${id}`),
};

// ── 文件上传 ──
export const uploadApi = {
  uploadData: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<unknown, IApiResponse<{ fileId: string }>>('/upload/data', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── 数据源 ──
export const dataSourceApi = {
  upload: (fileName: string, rows: Record<string, string | number>[], templateId?: string) =>
    api.post<unknown, IApiResponse<IDataSource>>('/data-sources/upload-json', {
      fileName,
      rows,
      templateId,
    }),

  get: (dataSourceId: string) =>
    api.get<unknown, IApiResponse<IDataSource>>(`/data-sources/${dataSourceId}`),
};

// ── 渲染任务 ──
export const renderJobApi = {
  create: (data: {
    templateId: string;
    dataSourceId: string;
    outputType?: string;
    range?: { type: string };
    options?: Record<string, unknown>;
  }) =>
    api.post<unknown, IApiResponse<{ jobId: string }>>('/render/jobs', data),

  getStatus: (jobId: string) =>
    api.get<unknown, IApiResponse<IRenderJob>>(`/render/jobs/${jobId}`),
};

// ── 批量生成 ──
export const batchApi = {
  generate: (data: { templateId: string; data: Record<string, string | number>[]; exportFormat?: string }) =>
    api.post<unknown, IApiResponse<{ jobId: string }>>('/batch/generate', data),

  getStatus: (jobId: string) =>
    api.get<unknown, IApiResponse<{
      jobId: string;
      status: string;
      total: number;
      completed: number;
      resultUrl: string | null;
    }>>(`/batch/status/${jobId}`),
};

// ── 导出 ──
export const exportApi = {
  exportPdf: (data: { templateId: string }) =>
    api.post<unknown, IApiResponse<{ url: string }>>('/export/pdf', data),

  exportImages: (data: { templateId: string }) =>
    api.post<unknown, IApiResponse<{ url: string }>>('/export/images', data),
};

export default api;
