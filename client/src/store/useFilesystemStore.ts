import { create } from 'zustand';
import { fileSystemStorage } from '@/services/fileSystemStorage';

interface FilesystemState {
  /** 已连接的文件夹名称 */
  directoryName: string | null;
  /** 浏览器是否支持 File System Access API */
  isSupported: boolean;
  /** 是否已连接且有权限 */
  isConnected: boolean;
  /** 是否正在选择文件夹 */
  isConnecting: boolean;

  /** 应用启动时检查已有连接 */
  checkConnection: () => Promise<void>;
  /** 用户点击选择文件夹（需用户手势） */
  connect: () => Promise<void>;
  /** 断开文件夹连接 */
  disconnect: () => Promise<void>;
  /** 重新请求权限（页面刷新后权限丢失时，需用户手势） */
  requestPermission: () => Promise<boolean>;
}

export const useFilesystemStore = create<FilesystemState>((set) => ({
  directoryName: null,
  isSupported: fileSystemStorage.isSupported(),
  isConnected: false,
  isConnecting: false,

  checkConnection: async () => {
    if (!fileSystemStorage.isSupported()) return;
    try {
      const dirName = await fileSystemStorage.getDirectoryName();
      if (!dirName) {
        set({ directoryName: null, isConnected: false });
        return;
      }
      const permitted = await fileSystemStorage.verifyPermission();
      set({ directoryName: dirName, isConnected: permitted });
    } catch {
      set({ directoryName: null, isConnected: false });
    }
  },

  connect: async () => {
    if (!fileSystemStorage.isSupported()) return;
    set({ isConnecting: true });
    try {
      const dirName = await fileSystemStorage.pickDirectory();
      if (dirName) {
        set({ directoryName: dirName, isConnected: true });
      }
      // 用户取消则不改变状态
    } catch {
      // 选择失败，不改变状态
    } finally {
      set({ isConnecting: false });
    }
  },

  disconnect: async () => {
    try {
      await fileSystemStorage.disconnect();
    } catch {
      // 清除失败也不影响
    }
    set({ directoryName: null, isConnected: false });
  },

  requestPermission: async () => {
    try {
      const granted = await fileSystemStorage.requestPermission();
      if (granted) {
        const dirName = await fileSystemStorage.getDirectoryName();
        set({ directoryName: dirName, isConnected: true });
      }
      return granted;
    } catch {
      return false;
    }
  },
}));
