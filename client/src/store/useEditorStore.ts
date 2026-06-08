import { create } from 'zustand';

interface EditorState {
  canvas: fabric.Canvas | null;
  activeObject: fabric.Object | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
  setActiveObject: (obj: fabric.Object | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  canvas: null,
  activeObject: null,
  setCanvas: (canvas) => set({ canvas }),
  setActiveObject: (activeObject) => set({ activeObject }),
}));
