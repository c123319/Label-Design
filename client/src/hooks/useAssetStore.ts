/**
 * GitHub 源素材库 Hook（向后兼容封装）。
 * 新代码使用 useStoreAssets('github' | 'backend', active)。
 */
import { useStoreAssets } from './useStore';

export function useAssetStore(active: boolean) {
  return useStoreAssets('github', active);
}
