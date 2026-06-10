import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 自部署后端的模板库 / 素材库服务（只读）。
 *
 * 与 GitHub template-store 仓库返回的 manifest/categories/assets 结构对齐，
 * 前端 BackendStoreProvider 可零转换复用现有逻辑。
 *
 * 写入（管理）接口留待后续按需添加；当前数据由部署方直接写库或通过迁移种子填充。
 */
@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  /** 模板清单（对齐 manifest.json） */
  async getManifest(): Promise<{
    version: string;
    templates: any[];
  }> {
    const templates = await this.prisma.storeTemplate.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });

    const lastUpdated = templates[0]?.updatedAt ?? new Date(0);
    // version 用最后更新时间戳，前端可据此做缓存失效
    const version = `backend-${lastUpdated.getTime()}`;

    return {
      version,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        categoryName: t.categoryName,
        width: t.width,
        height: t.height,
        unit: t.unit,
        thumbnail: t.thumbnail,
        // 后端模板内容直接由独立接口返回，这里用占位 URL 让前端走 fetchTemplate
        templateUrl: `templates/${t.id}.json`,
        tags: this.parseTags(t.tagsJson),
        featured: t.featured,
        sort: t.sort,
        version: t.version,
      })),
    };
  }

  /** 分类列表（对齐 categories.json） */
  async getCategories(): Promise<any[]> {
    const categories = await this.prisma.storeCategory.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });
    return categories.map((c) => ({
      code: c.code,
      name: c.name,
      sort: c.sort,
      collapsible: c.collapsible,
    }));
  }

  /** 单个模板内容（对齐 templates/*.json） */
  async getTemplate(id: string): Promise<any> {
    const tpl = await this.prisma.storeTemplate.findUnique({
      where: { id },
    });
    if (!tpl) throw new NotFoundException(`Template ${id} not found`);
    return JSON.parse(tpl.templateJson);
  }

  /** 素材清单（对齐 assets-manifest.json） */
  async getAssetsManifest(): Promise<{
    version: string;
    categories: any[];
    assets: any[];
  }> {
    const [assets, categories] = await Promise.all([
      this.prisma.storeAsset.findMany({
        orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.storeCategory.findMany({
        orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const lastUpdated =
      assets[0]?.updatedAt ?? categories[0]?.createdAt ?? new Date(0);
    const version = `backend-${lastUpdated.getTime()}`;

    return {
      version,
      categories: categories.map((c) => ({
        code: c.code,
        name: c.name,
        sort: c.sort,
        collapsible: c.collapsible,
      })),
      assets: assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        type: a.type,
        url: a.url ?? undefined,
        thumbnail: a.thumbnail ?? undefined,
        content: a.content ?? undefined,
        tags: this.parseTags(a.tagsJson),
        sort: a.sort,
      })),
    };
  }

  private parseTags(tagsJson: string): string[] {
    try {
      const parsed = JSON.parse(tagsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
