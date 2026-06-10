/**
 * 模板库服务层（向后兼容封装）。
 *
 * 历史代码直接引用 templateStoreService.* 的方法，这里保留这些导出，
 * 内部转发到 githubStoreProvider + 公共筛选/搜索工具。
 *
 * 新代码请使用 services/store 下的 getStoreProvider(source) 按源访问。
 */
import {
  TEMPLATE_STORE_BASE_URL,
} from '@/config/templateStore';
import { githubStoreProvider, isAllowedResourceUrl as _isAllowedResourceUrl } from '@/services/store/githubProvider';
import type { StoreSourceId } from '@/services/store/types';
import type {
  IAssetEntry,
  IAssetsManifest,
  ITemplateCategory,
  ITemplateStoreEntry,
  ITemplateStoreManifest,
} from '@shared/types/templateStore';
import type { ITemplate } from '@shared/types/template';

export const isAllowedResourceUrl = _isAllowedResourceUrl;

export const templateStoreService = {
  /** 仓库根 URL（GitHub 源） */
  getBaseUrl(): string {
    return TEMPLATE_STORE_BASE_URL.replace(/\/$/, '');
  },

  /** 解析相对路径为完整 URL（GitHub 源） */
  resolveUrl(relativePath: string): string {
    return `${this.getBaseUrl()}/${relativePath.replace(/^\//, '')}`;
  },

  /** 获取缩略图 URL（GitHub 源） */
  getThumbnailUrl(entry: ITemplateStoreEntry): string {
    return githubStoreProvider.getThumbnailUrl(entry);
  },

  /** 加载 manifest.json（GitHub 源） */
  async fetchManifest(force = false): Promise<ITemplateStoreManifest> {
    return githubStoreProvider.fetchManifest(force);
  },

  /** 加载 categories.json（GitHub 源） */
  async fetchCategories(): Promise<ITemplateCategory[]> {
    return githubStoreProvider.fetchCategories();
  },

  /** 加载单个模板 JSON 并转换为 ITemplate（GitHub 源） */
  async fetchTemplate(entry: ITemplateStoreEntry): Promise<ITemplate> {
    return githubStoreProvider.fetchTemplate(entry);
  },

  /** 按分类筛选模板 */
  filterByCategory(
    templates: ITemplateStoreEntry[],
    category: string,
  ): ITemplateStoreEntry[] {
    if (category === 'all') return templates;
    if (category === 'featured') {
      return templates
        .filter((t) => t.featured)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
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

  /** 加载 assets-manifest.json（GitHub 源） */
  async fetchAssetsManifest(force = false): Promise<IAssetsManifest> {
    return githubStoreProvider.fetchAssetsManifest(force);
  },

  /** 获取素材资源 URL（GitHub 源） */
  getAssetUrl(entry: IAssetEntry): string {
    return githubStoreProvider.getAssetUrl(entry);
  },

  /** 获取素材缩略图 URL（GitHub 源） */
  getAssetThumbnailUrl(entry: IAssetEntry): string | null {
    return githubStoreProvider.getAssetThumbnailUrl(entry);
  },

  /** 按分类筛选素材 */
  filterAssetsByCategory(
    assets: IAssetEntry[],
    category: string,
  ): IAssetEntry[] {
    return assets
      .filter((a) => a.category === category)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  },

  /** 搜索素材 */
  searchAssets(assets: IAssetEntry[], keyword: string): IAssetEntry[] {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(kw) ||
        a.content?.toLowerCase().includes(kw) ||
        a.tags?.some((tag) => tag.toLowerCase().includes(kw)),
    );
  },
};

export type { StoreSourceId };
