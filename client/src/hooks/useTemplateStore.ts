import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { templateStoreService } from '@/services/templateStore';
import type { ITemplateCategory, ITemplateStoreEntry } from '@shared/types/templateStore';

export function useTemplateStore(active: boolean) {
  const [entries, setEntries] = useState<ITemplateStoreEntry[]>([]);
  const [categories, setCategories] = useState<ITemplateCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [manifest, cats] = await Promise.all([
        templateStoreService.fetchManifest(force),
        templateStoreService.fetchCategories(),
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
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const loadTemplate = useCallback(async (entry: ITemplateStoreEntry) => {
    try {
      return await templateStoreService.fetchTemplate(entry);
    } catch {
      message.error(`加载模板 "${entry.name}" 失败`);
      return null;
    }
  }, []);

  return {
    entries,
    categories,
    loading,
    error,
    version,
    reload: () => load(true),
    loadTemplate,
    filterByCategory: (category: string) =>
      templateStoreService.filterByCategory(entries, category),
    search: (keyword: string) => templateStoreService.search(entries, keyword),
    getThumbnailUrl: (entry: ITemplateStoreEntry) =>
      templateStoreService.getThumbnailUrl(entry),
  };
}
