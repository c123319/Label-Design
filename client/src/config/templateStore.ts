/**
 * 远程模板库配置
 *
 * 默认使用 `${BASE_URL}template-store`，与 Vite base 保持一致（如 GitHub Pages 的 /Label-Design/template-store）。
 * 也可通过 VITE_TEMPLATE_STORE_BASE_URL 指向独立远程仓库。
 *
 * 示例：
 * VITE_TEMPLATE_STORE_BASE_URL=https://raw.githubusercontent.com/xxx/template-store/main
 */
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
