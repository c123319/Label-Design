/**
 * 通用模板库 / 素材库 Hook，支持任意源。
 *
 * useTemplateStore / useAssetStore 保留为 GitHub 源的兼容封装；
 * 新代码（私有模板库 Tab 等）使用本 Hook + 指定 source。
 */
import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { getStoreProvider } from '@/services/store';
import type { StoreSourceId } from '@/services/store/types';
import {
  filterByCategory,
  search,
  filterAssetsByCategory,
  searchAssets,
} from '@/services/storeUtils';
import type {
  IAssetCategory,
  IAssetEntry,
  ITemplateCategory,
  ITemplateStoreEntry,
} from '@shared/types/templateStore';
import type { ITemplate } from '@shared/types/template';

export function useStoreTemplate(source: StoreSourceId, active: boolean) {
  const [entries, setEntries] = useState<ITemplateStoreEntry[]>([]);
  const [categories, setCategories] = useState<ITemplateCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const provider = getStoreProvider(source);
        const [manifest, cats] = await Promise.all([
          provider.fetchManifest(force),
          provider.fetchCategories(),
        ]);
        setEntries(manifest.templates);
        setCategories(cats);
        setVersion(manifest.version);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '模板库加载失败';
        setError(msg);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [source],
  );

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const loadTemplate = useCallback(
    async (entry: ITemplateStoreEntry) => {
      try {
        return await getStoreProvider(source).fetchTemplate(entry);
      } catch {
        message.error(`加载模板 "${entry.name}" 失败`);
        return null;
      }
    },
    [source],
  );

  return {
    entries,
    categories,
    loading,
    error,
    version,
    reload: () => load(true),
    loadTemplate,
    filterByCategory: (category: string) =>
      filterByCategory(entries, category),
    search: (keyword: string) => search(entries, keyword),
    getThumbnailUrl: (entry: ITemplateStoreEntry) =>
      getStoreProvider(source).getThumbnailUrl(entry),
  };
}

export function useStoreAssets(source: StoreSourceId, active: boolean) {
  const [assets, setAssets] = useState<IAssetEntry[]>([]);
  const [categories, setCategories] = useState<IAssetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const manifest = await getStoreProvider(source).fetchAssetsManifest(
          force,
        );
        setAssets(manifest.assets);
        setCategories(
          manifest.categories.sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0)),
        );
        setVersion(manifest.version);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '素材库加载失败';
        setError(msg);
        setAssets([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    },
    [source],
  );

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
      filterAssetsByCategory(assets, category),
    search: (keyword: string) => searchAssets(assets, keyword),
    getAssetUrl: (entry: IAssetEntry) =>
      getStoreProvider(source).getAssetUrl(entry),
    getThumbnailUrl: (entry: IAssetEntry) =>
      getStoreProvider(source).getAssetThumbnailUrl(entry),
  };
}
