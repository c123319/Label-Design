/**
 * 自部署后端源。
 *
 * 通过 NestJS store 模块提供的 REST 接口加载模板与素材。
 * 与 GitHub 源不同：
 * - 模板内容由 `GET /api/store/templates/:id` 返回，不走 templateUrl 文件
 * - 缩略图 / 素材 url 可以是绝对 URL（外部 CDN）或相对路径（由后端静态服务提供）
 */
import {
  BACKEND_STORE_BASE_URL,
  BACKEND_STORE_ENABLED,
  isBackendAssetUrl,
} from '@/config/templateStore';
import type {
  IAssetEntry,
  IAssetsManifest,
  ITemplateCategory,
  ITemplateStoreEntry,
  ITemplateStoreManifest,
} from '@shared/types/templateStore';
import type { ITemplate } from '@shared/types/template';
import type { StoreProvider } from './types';

const MANIFEST_CACHE_KEY = 'backend-store-manifest';
const ASSETS_CACHE_KEY = 'backend-store-assets';

interface CachedManifest {
  version: string;
  templates: ITemplateStoreEntry[];
  fetchedAt: number;
}

interface CachedAssets {
  version: string;
  categories: IAssetsManifest['categories'];
  assets: IAssetEntry[];
  fetchedAt: number;
}

function resolveBackendUrl(relativePath: string): string {
  const base = BACKEND_STORE_BASE_URL.replace(/\/$/, '');
  const path = relativePath.replace(/^\//, '');
  return `${base}/${path}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`请求失败 ${res.status}: ${url}`);
  }
  const text = await res.text();
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

function readAssetsCache(): CachedAssets | null {
  try {
    const raw = sessionStorage.getItem(ASSETS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedAssets) : null;
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
}

function writeAssetsCache(manifest: IAssetsManifest): void {
  sessionStorage.setItem(
    ASSETS_CACHE_KEY,
    JSON.stringify({
      version: manifest.version,
      categories: manifest.categories,
      assets: manifest.assets,
      fetchedAt: Date.now(),
    }),
  );
}

export const backendStoreProvider: StoreProvider = {
  source: 'backend',

  async fetchManifest(force = false): Promise<ITemplateStoreManifest> {
    const url = resolveBackendUrl('api/store/manifest');
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

  async fetchCategories(): Promise<ITemplateCategory[]> {
    return fetchJson<ITemplateCategory[]>(
      resolveBackendUrl('api/store/categories'),
    );
  },

  async fetchTemplate(entry: ITemplateStoreEntry): Promise<ITemplate> {
    // 后端模板内容由 id 拉取，templateUrl 字段仅用于 GitHub 源
    const url = resolveBackendUrl(`api/store/templates/${entry.id}`);
    const data = await fetchJson<ITemplate>(url);

    // 后端可能返回 schemaVersion "1.0" 格式（含 canvas/objects）或 ITemplate（含 pages）
    if ('pages' in data && Array.isArray(data.pages)) {
      return {
        ...data,
        id: entry.id,
        name: data.name || entry.name,
        updatedAt: data.updatedAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
      };
    }

    // schemaVersion "1.0" 格式交给转换器（复用 GitHub 源逻辑，baseUrl 留空）
    const { convertStoreTemplateToITemplate } = await import(
      '@/utils/convertStoreTemplate'
    );
    return convertStoreTemplateToITemplate(data as any, '', entry);
  },

  async fetchAssetsManifest(force = false): Promise<IAssetsManifest> {
    const url = resolveBackendUrl('api/store/assets-manifest');
    if (!force) {
      const cached = readAssetsCache();
      if (cached) {
        try {
          const remote = await fetchJson<IAssetsManifest>(url);
          if (remote.version === cached.version) {
            return {
              version: cached.version,
              categories: cached.categories,
              assets: cached.assets,
            };
          }
          writeAssetsCache(remote);
          return remote;
        } catch {
          return {
            version: cached.version,
            categories: cached.categories,
            assets: cached.assets,
          };
        }
      }
    }
    const manifest = await fetchJson<IAssetsManifest>(url);
    writeAssetsCache(manifest);
    return manifest;
  },

  getThumbnailUrl(entry: ITemplateStoreEntry): string {
    // 缩略图可能是绝对 URL 或相对路径
    return isBackendAssetUrl(entry.thumbnail)
      ? entry.thumbnail
      : resolveBackendUrl(entry.thumbnail.replace(/^\//, ''));
  },

  getAssetUrl(entry: IAssetEntry): string {
    const path = entry.url || entry.thumbnail || '';
    if (!path) return '';
    return isBackendAssetUrl(path)
      ? path
      : resolveBackendUrl(path.replace(/^\//, ''));
  },

  getAssetThumbnailUrl(entry: IAssetEntry): string | null {
    const path = entry.thumbnail || entry.url;
    if (!path) return null;
    return isBackendAssetUrl(path)
      ? path
      : resolveBackendUrl(path.replace(/^\//, ''));
  },
};

export const isBackendStoreAvailable = (): boolean => BACKEND_STORE_ENABLED;
