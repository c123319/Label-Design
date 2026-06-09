import { TEMPLATE_STORE_ALLOWED_HOSTS, TEMPLATE_STORE_BASE_URL } from '@/config/templateStore';
import type {
  ITemplateCategory,
  ITemplateStoreEntry,
  ITemplateStoreManifest,
  IStoreTemplateFile,
} from '@shared/types/templateStore';
import type { ITemplate } from '@shared/types/template';
import { convertStoreTemplateToITemplate } from '@/utils/convertStoreTemplate';

const MANIFEST_CACHE_KEY = 'template-store-manifest';
const MANIFEST_VERSION_KEY = 'template-store-version';

interface CachedManifest {
  version: string;
  templates: ITemplateStoreEntry[];
  fetchedAt: number;
}

function resolveStoreUrl(relativePath: string): string {
  const base = TEMPLATE_STORE_BASE_URL.replace(/\/$/, '');
  const path = relativePath.replace(/^\//, '');
  return `${base}/${path}`;
}

/** 校验资源 URL 是否在白名单域名内 */
export function isAllowedResourceUrl(url: string): boolean {
  if (!TEMPLATE_STORE_ALLOWED_HOSTS.length) return true;
  try {
    const host = new URL(url, window.location.origin).hostname;
    return TEMPLATE_STORE_ALLOWED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  if (!isAllowedResourceUrl(url)) {
    throw new Error(`资源域名未授权: ${url}`);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`请求失败 ${res.status}: ${url}`);
  }
  const text = await res.text();
  // 禁止脚本注入：拒绝含 <script 的 JSON 响应
  if (/<script/i.test(text)) {
    throw new Error('模板数据包含非法内容');
  }
  return JSON.parse(text) as T;
}

function readManifestCache(): CachedManifest | null {
  try {
    const raw = sessionStorage.getItem(MANIFEST_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedManifest) : null;
  } catch {
    return null;
  }
}

function writeManifestCache(manifest: ITemplateStoreManifest): void {
  sessionStorage.setItem(
    MANIFEST_CACHE_KEY,
    JSON.stringify({
      version: manifest.version,
      templates: manifest.templates,
      fetchedAt: Date.now(),
    }),
  );
  sessionStorage.setItem(MANIFEST_VERSION_KEY, manifest.version);
}

export const templateStoreService = {
  /** 仓库根 URL */
  getBaseUrl(): string {
    return TEMPLATE_STORE_BASE_URL.replace(/\/$/, '');
  },

  /** 解析相对路径为完整 URL */
  resolveUrl(relativePath: string): string {
    return resolveStoreUrl(relativePath);
  },

  /** 获取缩略图 URL */
  getThumbnailUrl(entry: ITemplateStoreEntry): string {
    return resolveStoreUrl(entry.thumbnail);
  },

  /** 加载 manifest.json，同版本时使用缓存 */
  async fetchManifest(force = false): Promise<ITemplateStoreManifest> {
    const url = resolveStoreUrl('manifest.json');
    if (!force) {
      const cached = readManifestCache();
      if (cached) {
        try {
          const remote = await fetchJson<ITemplateStoreManifest>(url);
          if (remote.version === cached.version) {
            return { version: cached.version, templates: cached.templates };
          }
          writeManifestCache(remote);
          return remote;
        } catch {
          return { version: cached.version, templates: cached.templates };
        }
      }
    }
    const manifest = await fetchJson<ITemplateStoreManifest>(url);
    writeManifestCache(manifest);
    return manifest;
  },

  /** 加载 categories.json */
  async fetchCategories(): Promise<ITemplateCategory[]> {
    return fetchJson<ITemplateCategory[]>(resolveStoreUrl('categories.json'));
  },

  /** 加载单个模板 JSON 并转换为 ITemplate */
  async fetchTemplate(entry: ITemplateStoreEntry): Promise<ITemplate> {
    const url = resolveStoreUrl(entry.templateUrl);
    const data = await fetchJson<IStoreTemplateFile | ITemplate>(url);

    // 已是 ITemplate 格式（含 pages 字段）则直接返回
    if ('pages' in data && Array.isArray(data.pages)) {
      return {
        ...data,
        id: entry.id,
        name: data.name || entry.name,
        updatedAt: data.updatedAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
      };
    }

    return convertStoreTemplateToITemplate(
      data as IStoreTemplateFile,
      resolveStoreUrl(''),
      entry,
    );
  },

  /** 按分类筛选模板 */
  filterByCategory(
    templates: ITemplateStoreEntry[],
    category: string,
  ): ITemplateStoreEntry[] {
    if (category === 'all') return templates;
    if (category === 'featured') {
      return templates.filter((t) => t.featured).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }
    return templates
      .filter((t) => t.category === category)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  },

  /** 关键词搜索 */
  search(
    templates: ITemplateStoreEntry[],
    keyword: string,
  ): ITemplateStoreEntry[] {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(kw) ||
        t.categoryName.toLowerCase().includes(kw) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(kw)),
    );
  },
};
