import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RenderTemplate } from '../../types/render-types';

const TEMPLATE_RELATIONS = {
  dataSource: true,
  bindings: true,
} as const;

function deserializeTemplate(record: any): any {
  let parsed: any = {};
  try {
    parsed = JSON.parse(record.templateJson ?? '{}');
  } catch {
    parsed = {};
  }

  // 还原 bindings[] 到顶层，方便前端读取
  const bindings = (record.bindings ?? []).map((b: any) => ({
    id: b.id,
    elementId: b.elementId,
    elementType: b.elementType,
    bindingType: b.bindingType,
    fieldCode: b.fieldCode ?? undefined,
    template: b.templateText ?? undefined,
    defaultValue: b.defaultValue ?? undefined,
  }));

  return {
    ...parsed,
    id: record.id,
    name: record.name,
    description: record.description ?? '',
    pages: parsed.pages ?? [],
    dataSourceId: record.dataSourceId ?? undefined,
    bindings,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(template: any): Promise<{ id: string }> {
    const id = template.id || `tpl_${Date.now()}`;
    const { pages, bindings, dataSourceId, ...rest } = template;
    const templateJson = JSON.stringify({ ...rest, pages });

    await this.prisma.template.create({
      data: {
        id,
        name: template.name ?? '未命名模板',
        description: template.description ?? '',
        templateJson,
        dataSourceId: dataSourceId ?? null,
      },
    });

    return { id };
  }

  async findAll(): Promise<any[]> {
    const records = await this.prisma.template.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { ...TEMPLATE_RELATIONS },
    });
    return records.map(deserializeTemplate);
  }

  async findOne(id: string): Promise<any> {
    const record = await this.prisma.template.findUnique({
      where: { id },
      include: { ...TEMPLATE_RELATIONS },
    });
    if (!record) throw new NotFoundException(`Template ${id} not found`);
    return deserializeTemplate(record);
  }

  /**
   * upsert：渲染模块在创建任务时会用 templateSnapshot 覆盖现有模板，
   * 如果模板尚未入库（snapshot 模式），则插入。
   */
  async update(id: string, data: any): Promise<any> {
    const { pages, bindings, dataSourceId, ...rest } = data;
    const templateJson = pages
      ? JSON.stringify({ ...rest, pages })
      : JSON.stringify(rest);

    const record = await this.prisma.template.upsert({
      where: { id },
      update: {
        name: data.name,
        description: data.description,
        templateJson,
        dataSourceId: dataSourceId ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id,
        name: data.name ?? '未命名模板',
        description: data.description ?? '',
        templateJson,
        dataSourceId: dataSourceId ?? null,
      },
      include: { ...TEMPLATE_RELATIONS },
    });

    return deserializeTemplate(record);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.template.delete({ where: { id } });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async setDataSource(
    id: string,
    dataSourceId: string | null,
  ): Promise<void> {
    await this.prisma.template.update({
      where: { id },
      data: { dataSourceId },
    });
  }

  /**
   * 全量覆盖保存绑定关系。
   * 前端每次提交完整的 bindings[]，后端先删后插，保证一致性。
   */
  async saveBindings(
    templateId: string,
    bindings: any[],
  ): Promise<{ success: boolean; count: number }> {
    await this.findOne(templateId); // 模板不存在则抛 404

    await this.prisma.$transaction([
      this.prisma.templateBinding.deleteMany({
        where: { templateId },
      }),
      ...(bindings.length
        ? [
            this.prisma.templateBinding.createMany({
              data: bindings.map((b) => ({
                templateId,
                elementId: b.elementId,
                elementType: b.elementType ?? 'text',
                bindingType: b.bindingType ?? 'singleField',
                fieldCode: b.fieldCode ?? null,
                templateText: b.template ?? null,
                defaultValue: b.defaultValue ?? null,
                extraJson: b.extra ? JSON.stringify(b.extra) : null,
              })),
            }),
          ]
        : []),
    ]);

    return { success: true, count: bindings.length };
  }

  /** 以渲染模块需要的最小结构返回 */
  async findOneAsRenderTemplate(id: string): Promise<RenderTemplate | undefined> {
    const record = await this.prisma.template.findUnique({ where: { id } });
    if (!record) return undefined;
    const parsed = JSON.parse(record.templateJson ?? '{}');
    return {
      id: record.id,
      name: record.name,
      pages: parsed.pages ?? [],
    };
  }
}
