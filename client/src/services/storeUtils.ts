/**
 * 模板 / 素材列表的纯函数工具（与源无关，可被任意 provider 复用）。
 */
import type {
  IAssetEntry,
  ITemplateStoreEntry,
} from '@shared/types/templateStore';

export function filterByCategory(
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
}

export function search(
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
}

export function filterAssetsByCategory(
  assets: IAssetEntry[],
  category: string,
): IAssetEntry[] {
  return assets
    .filter((a) => a.category === category)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

export function searchAssets(
  assets: IAssetEntry[],
  keyword: string,
): IAssetEntry[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return assets;
  return assets.filter(
    (a) =>
      a.name.toLowerCase().includes(kw) ||
      a.content?.toLowerCase().includes(kw) ||
      a.tags?.some((tag) => tag.toLowerCase().includes(kw)),
  );
}
