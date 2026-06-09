import type { ITemplate } from '@shared/types/template';

const STORAGE_KEY = 'label-templates';

function readAll(): ITemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(templates: ITemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export const localTemplateStorage = {
  /** 保存/更新模板（按 id 去重） */
  save(template: ITemplate): ITemplate {
    const templates = readAll();
    const idx = templates.findIndex((t) => t.id === template.id);
    const updated: ITemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      templates[idx] = updated;
    } else {
      templates.push(updated);
    }
    writeAll(templates);
    return updated;
  },

  /** 返回所有本地模板 */
  list(): ITemplate[] {
    return readAll();
  },

  /** 获取单个模板 */
  get(id: string): ITemplate | undefined {
    return readAll().find((t) => t.id === id);
  },

  /** 删除模板 */
  remove(id: string): boolean {
    const templates = readAll();
    const filtered = templates.filter((t) => t.id !== id);
    if (filtered.length === templates.length) return false;
    writeAll(filtered);
    return true;
  },

  /** 清空所有本地模板 */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
