/**
 * 远程模板库配置
 *
 * 开发环境默认使用本地 /template-store 目录（由 Vite 静态服务提供）。
 * 生产环境通过 VITE_TEMPLATE_STORE_BASE_URL 指向 GitHub/Gitee/OSS 仓库根路径。
 *
 * 示例：
 * VITE_TEMPLATE_STORE_BASE_URL=https://raw.githubusercontent.com/xxx/template-store/main
 */
export const TEMPLATE_STORE_BASE_URL =
  import.meta.env.VITE_TEMPLATE_STORE_BASE_URL || '/template-store';

/** 允许加载资源的域名白名单（空数组表示不限制） */
export const TEMPLATE_STORE_ALLOWED_HOSTS: string[] = (
  import.meta.env.VITE_TEMPLATE_STORE_ALLOWED_HOSTS || ''
)
  .split(',')
  .map((h: string) => h.trim())
  .filter(Boolean);
