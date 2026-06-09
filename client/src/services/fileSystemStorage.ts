import type { ITemplate } from '@shared/types/template';

// ── IndexedDB 持久化 ──

const DB_NAME = 'label-design-fs';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'directoryHandle';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function removeHandle(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── 文件名清洗 ──

function sanitizeFileName(name: string): string {
  // 去除 Windows 不允许的字符
  let safe = name.replace(/[\\/:*?"<>|]/g, '_');
  // 空格序列替换为单个下划线
  safe = safe.replace(/\s+/g, '_');
  // 截断到 80 字符
  if (safe.length > 80) safe = safe.substring(0, 80);
  return `${safe}.json`;
}

// ── 导出接口 ──

export const fileSystemStorage = {
  /** 浏览器是否支持 File System Access API */
  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  },

  /** 弹出文件夹选择器，返回文件夹名或 null（取消） */
  async pickDirectory(): Promise<string | null> {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await saveHandle(handle);
      return handle.name;
    } catch (e: unknown) {
      // 用户取消选择
      if (e instanceof Error && e.name === 'AbortError') return null;
      throw e;
    }
  },

  /** 获取已存储的目录 handle（可能为 null） */
  async getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
    return loadHandle();
  },

  /** 检查当前权限是否为 granted */
  async verifyPermission(handle?: FileSystemDirectoryHandle): Promise<boolean> {
    const dir = handle ?? (await loadHandle());
    if (!dir) return false;
    try {
      const state = await dir.queryPermission({ mode: 'readwrite' });
      return state === 'granted';
    } catch {
      return false;
    }
  },

  /** 请求权限（需用户手势触发） */
  async requestPermission(handle?: FileSystemDirectoryHandle): Promise<boolean> {
    const dir = handle ?? (await loadHandle());
    if (!dir) return false;
    try {
      const state = await dir.requestPermission({ mode: 'readwrite' });
      return state === 'granted';
    } catch {
      return false;
    }
  },

  /** 获取已连接的文件夹名称 */
  async getDirectoryName(): Promise<string | null> {
    const handle = await loadHandle();
    return handle?.name ?? null;
  },

  /** 列出文件夹中所有有效的模板文件 */
  async list(): Promise<ITemplate[]> {
    const handle = await loadHandle();
    if (!handle) return [];

    const templates: ITemplate[] = [];
    for await (const entry of handle.values()) {
      if (entry.kind !== 'file') continue;
      if (!entry.name.endsWith('.json')) continue;
      try {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        // 基本验证
        if (!parsed.pages || !Array.isArray(parsed.pages) || !parsed.name) continue;
        templates.push(parsed as ITemplate);
      } catch {
        // 单个文件解析失败不影响整体
      }
    }
    return templates;
  },

  /** 保存模板为 JSON 文件 */
  async save(template: ITemplate): Promise<ITemplate> {
    const handle = await loadHandle();
    if (!handle) throw new Error('未连接文件夹');

    const updated: ITemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };
    const fileName = sanitizeFileName(template.name || template.id);
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(updated, null, 2));
    await writable.close();
    return updated;
  },

  /** 删除模板文件 */
  async remove(name: string): Promise<boolean> {
    const handle = await loadHandle();
    if (!handle) return false;
    try {
      const fileName = sanitizeFileName(name);
      await handle.removeEntry(fileName);
      return true;
    } catch {
      return false;
    }
  },

  /** 断开文件夹连接，清除 IndexedDB 中的 handle */
  async disconnect(): Promise<void> {
    await removeHandle();
  },
};
