import { create } from 'zustand';
import { fabric } from 'fabric';
import type { ITemplate, ITemplatePage } from '@shared/types/template';

/** 默认模板尺寸 (100x70mm 标签，300dpi → 1181x827px) */
const DEFAULT_SIZE = { width: 1181, height: 827 };

/** 创建空白页 */
function createBlankPage(w: number, h: number): ITemplatePage {
  return { width: w, height: h, background: '#ffffff', objects: [] };
}

interface EditorState {
  // ── 画布 ──
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;

  // ── 选中对象（单选 + 多选） ──
  activeObject: fabric.Object | null;
  setActiveObject: (obj: fabric.Object | null) => void;
  activeObjects: fabric.Object[];
  setActiveObjects: (objs: fabric.Object[]) => void;

  // ── 剪贴板 ──
  clipboard: string | null;

  // ── 编辑器操作 ──
  copySelected: () => void;
  pasteObject: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  deleteSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;

  // ── 网格 ──
  showGrid: boolean;
  toggleGrid: (visible?: boolean) => void;

  // ── 页面管理 ──
  pages: ITemplatePage[];
  currentPageIndex: number;
  addPage: () => void;
  removePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  setCurrentPage: (index: number) => void;

  // ── 模板信息 ──
  templateName: string;
  templateSize: { width: number; height: number };
  setTemplateName: (name: string) => void;
  setTemplateSize: (size: { width: number; height: number }) => void;

  // ── 缩放 ──
  zoom: number;
  setZoom: (zoom: number) => void;

  // ── 数据导入 ──
  importedData: Record<string, string | number>[];
  fieldMapping: Record<string, string>;
  setImportedData: (data: Record<string, string | number>[]) => void;
  setFieldMapping: (mapping: Record<string, string>) => void;

  // ── 历史记录 ──
  historyIndex: number;
  historyStack: string[];
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // ── 导出 / 导入 ──
  exportAsJSON: () => ITemplate;
  loadFromJSON: (template: ITemplate) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // ── 画布 ──
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),

  // ── 选中对象 ──
  activeObject: null,
  setActiveObject: (activeObject) => set({ activeObject }),
  activeObjects: [],
  setActiveObjects: (activeObjects) => set({ activeObjects }),

  // ── 剪贴板 ──
  clipboard: null,

  // ── 编辑器操作 ──
  copySelected: () => {
    const { canvas } = get();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const json = JSON.stringify(active.toJSON());
    set({ clipboard: json });
  },

  pasteObject: () => {
    const { canvas, clipboard } = get();
    if (!canvas || !clipboard) return;
    // 从剪贴板 JSON 加载对象
    const parsed = JSON.parse(clipboard);
    const obj = parsed;
    obj.left = (obj.left || 0) + 20;
    obj.top = (obj.top || 0) + 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callback: any = (objects: fabric.Object[]) => {
      objects.forEach((o) => canvas.add(o));
      if (objects.length === 1) canvas.setActiveObject(objects[0]);
      canvas.renderAll();
    };
    fabric.util.enlivenObjects([obj], callback, '');
  },

  duplicateSelected: () => {
    const { canvas } = get();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone((cloned: fabric.Object) => {
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  },

  selectAll: () => {
    const { canvas } = get();
    if (!canvas) return;
    canvas.discardActiveObject();
    const filtered = canvas.getObjects().filter((obj) => !(obj as any)._isGrid);
    const sel = new fabric.ActiveSelection(filtered, { canvas });
    canvas.setActiveObject(sel);
    canvas.requestRenderAll();
  },

  deleteSelected: () => {
    const { canvas } = get();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.type === 'activeSelection') {
      (active as fabric.ActiveSelection).forEachObject((obj) => canvas.remove(obj));
    } else {
      canvas.remove(active);
    }
    canvas.discardActiveObject();
    canvas.renderAll();
  },

  groupSelected: () => {
    const { canvas } = get();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'activeSelection') return;
    const group = (active as fabric.ActiveSelection).toGroup();
    canvas.setActiveObject(group);
    canvas.renderAll();
  },

  ungroupSelected: () => {
    const { canvas } = get();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'group') return;
    const group = active as fabric.Group;
    const items = group.getObjects();
    const groupLeft = active.left || 0;
    const groupTop = active.top || 0;
    canvas.remove(active);
    items.forEach((item: any) => {
      item.set({
        left: (item.left || 0) + groupLeft,
        top: (item.top || 0) + groupTop,
      });
      canvas.add(item);
    });
    canvas.renderAll();
  },

  // ── 网格 ──
  showGrid: true,
  toggleGrid: (visible) => {
    const { canvas, showGrid } = get();
    const newVal = visible !== undefined ? visible : !showGrid;
    set({ showGrid: newVal });
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      if ((obj as any)._isGrid) {
        obj.set('visible', newVal);
      }
    });
    canvas.renderAll();
  },

  // ── 页面管理 ──
  pages: [createBlankPage(DEFAULT_SIZE.width, DEFAULT_SIZE.height)],
  currentPageIndex: 0,

  addPage: () => {
    const { pages, templateSize } = get();
    set({
      pages: [...pages, createBlankPage(templateSize.width, templateSize.height)],
      currentPageIndex: pages.length,
    });
  },

  removePage: (index) => {
    const { pages, currentPageIndex } = get();
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    const newIndex = Math.min(currentPageIndex, newPages.length - 1);
    set({ pages: newPages, currentPageIndex: newIndex });
  },

  duplicatePage: (index) => {
    const { pages } = get();
    const source = pages[index];
    const copy: ITemplatePage = JSON.parse(JSON.stringify(source));
    const newPages = [...pages];
    newPages.splice(index + 1, 0, copy);
    set({ pages: newPages, currentPageIndex: index + 1 });
  },

  setCurrentPage: (index) => {
    set({ currentPageIndex: index });
  },

  // ── 模板信息 ──
  templateName: '未命名模板',
  templateSize: { ...DEFAULT_SIZE },
  setTemplateName: (templateName) => set({ templateName }),
  setTemplateSize: (size) => set({ templateSize: size }),

  // ── 缩放 ──
  zoom: 1,
  setZoom: (zoom) => {
    const { canvas } = get();
    if (canvas) {
      canvas.setZoom(zoom);
      canvas.setDimensions(
        { width: canvas.getWidth() * (zoom / get().zoom), height: canvas.getHeight() * (zoom / get().zoom) },
        { cssOnly: true },
      );
    }
    set({ zoom });
  },

  // ── 数据导入 ──
  importedData: [],
  fieldMapping: {},
  setImportedData: (importedData) => set({ importedData }),
  setFieldMapping: (fieldMapping) => set({ fieldMapping }),

  // ── 历史记录 ──
  historyIndex: -1,
  historyStack: [],

  saveHistory: () => {
    const { canvas, historyStack, historyIndex } = get();
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(json);
    if (newStack.length > 50) newStack.shift();
    set({ historyStack: newStack, historyIndex: newStack.length - 1 });
  },

  undo: () => {
    const { canvas, historyStack, historyIndex } = get();
    if (!canvas || historyIndex <= 0) return;
    const prev = historyStack[historyIndex - 1];
    canvas.loadFromJSON(JSON.parse(prev), () => {
      canvas.renderAll();
      set({ historyIndex: historyIndex - 1 });
    });
  },

  redo: () => {
    const { canvas, historyStack, historyIndex } = get();
    if (!canvas || historyIndex >= historyStack.length - 1) return;
    const next = historyStack[historyIndex + 1];
    canvas.loadFromJSON(JSON.parse(next), () => {
      canvas.renderAll();
      set({ historyIndex: historyIndex + 1 });
    });
  },

  // ── 导出 / 导入 ──
  exportAsJSON: () => {
    const { canvas, pages, currentPageIndex, templateName, templateSize } = get();
    const updatedPages = [...pages];
    if (canvas) {
      const json = canvas.toJSON();
      updatedPages[currentPageIndex] = {
        width: templateSize.width,
        height: templateSize.height,
        background: canvas.backgroundColor as string || '#ffffff',
        objects: (json.objects || []) as any[],
      };
    }
    return {
      id: `tpl_${Date.now()}`,
      name: templateName,
      pages: updatedPages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ITemplate;
  },

  loadFromJSON: (template: ITemplate) => {
    const { canvas } = get();
    set({
      templateName: template.name,
      pages: template.pages,
      currentPageIndex: 0,
    });
    if (canvas && template.pages.length > 0) {
      const page = template.pages[0];
      canvas.loadFromJSON({ objects: page.objects, background: page.background }, () => {
        canvas.renderAll();
      });
    }
  },
}));
