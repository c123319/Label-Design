/** 渲染模块使用的模板类型（与 shared 保持一致） */
export interface RenderTemplatePage {
  width: number;
  height: number;
  background?: string;
  objects: unknown[];
}

export interface RenderTemplate {
  id: string;
  name: string;
  pages: RenderTemplatePage[];
}
