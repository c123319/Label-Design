/**
 * 模板库 / 素材库源抽象。
 *
 * 不同源（GitHub 仓库、自部署后端、未来的 OSS/Gitee）只要实现此接口，
 * 前端即可统一调度。返回类型与 template-store 的 manifest 格式保持一致，
 * 由调用方（templateStoreService）做后续转换。
 */
import type {
  ITemplateCategory,
  ITemplateStoreEntry,
  ITemplateStoreManifest,
  IStoreTemplateFile,
  IAssetsManifest,
  IAssetEntry,
} from '@shared/types/templateStore';
import type { ITemplate } from '@shared/types/template';

export type StoreSourceId = 'github' | 'backend';

export interface StoreSourceMeta {
  id: StoreSourceId;
  /** 展示名称，如「官方模板库」「私有模板库」 */
  name: string;
  /** 是否可用（后端源未配置时禁用） */
  enabled: boolean;
}

export interface StoreProvider {
  readonly source: StoreSourceId;
  /** 加载模板清单 */
  fetchManifest(force?: boolean): Promise<ITemplateStoreManifest>;
  /** 加载分类 */
  fetchCategories(): Promise<ITemplateCategory[]>;
  /** 加载单个模板并转换为 ITemplate */
  fetchTemplate(entry: ITemplateStoreEntry): Promise<ITemplate>;
  /** 加载素材清单 */
  fetchAssetsManifest(force?: boolean): Promise<IAssetsManifest>;
  /** 获取缩略图完整 URL */
  getThumbnailUrl(entry: ITemplateStoreEntry): string;
  /** 获取素材资源完整 URL */
  getAssetUrl(entry: IAssetEntry): string;
  /** 获取素材缩略图完整 URL */
  getAssetThumbnailUrl(entry: IAssetEntry): string | null;
}

export type {
  ITemplateCategory,
  ITemplateStoreEntry,
  ITemplateStoreManifest,
  IStoreTemplateFile,
  IAssetsManifest,
  IAssetEntry,
};
