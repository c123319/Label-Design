/**
 * 模板库 / 素材库调度层。
 *
 * 维护所有 StoreProvider，提供按源访问的统一入口。
 * 旧的 templateStoreService（services/templateStore.ts）保留为 GitHub 源的兼容封装。
 */
import { githubStoreProvider } from './githubProvider';
import { backendStoreProvider } from './backendProvider';
import type { StoreProvider, StoreSourceId, StoreSourceMeta } from './types';

export type { StoreProvider, StoreSourceId, StoreSourceMeta };

/** 所有已注册的源 */
const providers: Record<StoreSourceId, StoreProvider> = {
  github: githubStoreProvider,
  backend: backendStoreProvider,
};

import { BACKEND_STORE_ENABLED } from '@/config/templateStore';

/** 可用源列表（前端用于渲染源切换 UI） */
export function listStoreSources(): StoreSourceMeta[] {
  return [
    { id: 'github', name: '官方模板库', enabled: true },
    { id: 'backend', name: '私有模板库', enabled: BACKEND_STORE_ENABLED },
  ];
}

/** 获取指定源的 provider */
export function getStoreProvider(source: StoreSourceId): StoreProvider {
  const provider = providers[source];
  if (!provider) {
    throw new Error(`未知的模板库源: ${source}`);
  }
  return provider;
}

/** 默认源（GitHub） */
export const defaultStoreProvider = providers.github;
