/**
 * 模板库 / 素材库源配置。
 *
 * 支持两个源：
 * - GitHub 仓库（默认）：通过 VITE_TEMPLATE_STORE_BASE_URL 指向 raw.githubusercontent.com / OSS
 * - 自部署后端：通过 VITE_BACKEND_STORE_BASE_URL 指向 NestJS 服务（默认 /，即同源）
 */

/** GitHub 源基础 URL（默认同源 /template-store，由 Vite 静态服务） */
function defaultTemplateStoreBaseUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/template-store`;
}

export const TEMPLATE_STORE_BASE_URL =
  import.meta.env.VITE_TEMPLATE_STORE_BASE_URL || defaultTemplateStoreBaseUrl();

/** 允许加载资源的域名白名单（空数组表示不限制） */
export const TEMPLATE_STORE_ALLOWED_HOSTS: string[] = (
  import.meta.env.VITE_TEMPLATE_STORE_ALLOWED_HOSTS || ''
)
  .split(',')
  .map((h: string) => h.trim())
  .filter(Boolean);

// ───────────────────────────────────────────────
// 自部署后端源
// ───────────────────────────────────────────────

/**
 * 后端服务基础 URL。默认同源（前端和后端部署在同一域）。
 * 单独部署时设置为后端域名，如 https://api.example.com
 */
export const BACKEND_STORE_BASE_URL: string = (
  import.meta.env.VITE_BACKEND_STORE_BASE_URL || ''
).replace(/\/$/, '');

/**
 * 后端源是否启用。满足任一条件即启用：
 * - 显式设置 VITE_BACKEND_STORE_ENABLED="true"
 * - 设置了 BACKEND_STORE_BASE_URL（非空）
 * - 处于同源部署（base 为 / 或以 / 开头且不是完整 URL）
 */
export const BACKEND_STORE_ENABLED: boolean =
  String(import.meta.env.VITE_BACKEND_STORE_ENABLED || '').toLowerCase() ===
    'true' || BACKEND_STORE_BASE_URL.length > 0;

/**
 * 判断资源 URL 是否为绝对 URL（http/https 开头），
 * 用于后端源区分「外部 CDN 资源」与「后端静态服务资源」。
 */
export function isBackendAssetUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
