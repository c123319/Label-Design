import { useState, useCallback, useEffect } from 'react';
import { templateStoreService } from '@/services/templateStore';
import type { IAssetCategory, IAssetEntry } from '@shared/types/templateStore';

export function useAssetStore(active: boolean) {
  const [assets, setAssets] = useState<IAssetEntry[]>([]);
  const [categories, setCategories] = useState<IAssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const manifest = await templateStoreService.fetchAssetsManifest(force);
      setAssets(manifest.assets);
      setCategories(manifest.categories.sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0)));
      setVersion(manifest.version);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '素材库加载失败';
      setError(msg);
      setAssets([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  return {
    assets,
    categories,
    loading,
    error,
    version,
    reload: () => load(true),
    filterByCategory: (category: string) =>
      templateStoreService.filterAssetsByCategory(assets, category),
    search: (keyword: string) => templateStoreService.searchAssets(assets, keyword),
    getAssetUrl: (entry: IAssetEntry) => templateStoreService.getAssetUrl(entry),
    getThumbnailUrl: (entry: IAssetEntry) => templateStoreService.getAssetThumbnailUrl(entry),
  };
}
