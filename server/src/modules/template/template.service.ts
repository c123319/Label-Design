import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateService {
  private templates: Map<string, any> = new Map();

  create(template: any): { id: string } {
    const id = template.id || `tpl_${Date.now()}`;
    this.templates.set(id, { ...template, id, createdAt: new Date(), updatedAt: new Date() });
    return { id };
  }

  findAll(): any[] {
    return Array.from(this.templates.values());
  }

  findOne(id: string): any {
    return this.templates.get(id);
  }

  update(id: string, data: any): any {
    const existing = this.templates.get(id);
    if (!existing) {
      return this.create(data);
    }
    const updated = { ...existing, ...data, id, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  remove(id: string): { success: boolean } {
    return { success: this.templates.delete(id) };
  }
}
