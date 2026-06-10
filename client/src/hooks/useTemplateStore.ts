/**
 * GitHub 源模板库 Hook（向后兼容封装）。
 * 新代码使用 useStoreTemplate('github' | 'backend', active)。
 */
import { useStoreTemplate } from './useStore';

export function useTemplateStore(active: boolean) {
  return useStoreTemplate('github', active);
}
