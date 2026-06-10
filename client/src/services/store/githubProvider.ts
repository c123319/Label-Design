/**
 * GitHub 仓库源（默认）。
 *
 * 封装原 templateStoreService 的 fetch 行为，实现 StoreProvider 接口。
 * 行为与改造前完全一致，保证向后兼容。
 */
import {
  TEMPLATE_STORE_ALLOWED_HOSTS,
  TEMPLATE_STORE_BASE_URL,
} from '@/config/templateStore';
import type {
  IAssetEntry,
  IAssetsManifest,
  IStoreTemplateFile,
  ITemplateCategory,
  ITemplateStoreEntry,
  ITemplateStoreManifest,
} from '@shared/types/templateStore';
import type { ITemplate } from '@shared/types/template';
import { convertStoreTemplateToITemplate } from '@/utils/convertStoreTemplate';
import type { StoreProvider } from './types';

const MANIFEST_CACHE_KEY = 'template-store-manifest';
const MANIFEST_VERSION_KEY = 'template-store-version';
const ASSETS_CACHE_KEY = 'template-store-assets';

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

function resolveStoreUrl(relativePath: string): string {
  const base = TEMPLATE_STORE_BASE_URL.replace(/\/$/, '');
  const path = relativePath.replace(/^\//, '');
  return `${base}/${path}`;
}

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
  sessionStorage.setItem(MANIFEST_VERSION_KEY, manifest.version);
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

export const githubStoreProvider: StoreProvider = {
  source: 'github',

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

  async fetchCategories(): Promise<ITemplateCategory[]> {
    return fetchJson<ITemplateCategory[]>(resolveStoreUrl('categories.json'));
  },

  async fetchTemplate(entry: ITemplateStoreEntry): Promise<ITemplate> {
    const url = resolveStoreUrl(entry.templateUrl);
    const data = await fetchJson<IStoreTemplateFile | ITemplate>(url);

    if ('pages' in data && Array.isArray(data.pages)) {
      return {
        ...(data as ITemplate),
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

  async fetchAssetsManifest(force = false): Promise<IAssetsManifest> {
    const url = resolveStoreUrl('assets-manifest.json');
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
    return resolveStoreUrl(entry.thumbnail);
  },

  getAssetUrl(entry: IAssetEntry): string {
    const path = entry.url || entry.thumbnail || '';
    return resolveStoreUrl(path);
  },

  getAssetThumbnailUrl(entry: IAssetEntry): string | null {
    const path = entry.thumbnail || entry.url;
    return path ? resolveStoreUrl(path) : null;
  },
};
