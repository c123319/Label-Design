import { fabric } from 'fabric';

export function isEditableText(obj: fabric.Object | null | undefined): obj is fabric.IText {
  return !!obj && (obj.type === 'i-text' || obj.type === 'textbox');
}

export function ensureTextEditable(obj: fabric.Object) {
  if (!isEditableText(obj)) return;
  obj.set({
    editable: true,
    evented: true,
    selectable: true,
  });
}

export function enterTextEditing(obj: fabric.Object, e?: MouseEvent | Event) {
  if (!isEditableText(obj) || !obj.editable) return;
  if (obj.isEditing) return;
  obj.enterEditing(e as MouseEvent | undefined);
  if (e && 'clientX' in e) {
    obj.setCursorByClick(e);
  }
}

export function focusTextForEdit(canvas: fabric.Canvas, obj: fabric.Object) {
  if (!isEditableText(obj)) return;
  requestAnimationFrame(() => {
    canvas.setActiveObject(obj);
    enterTextEditing(obj);
    obj.selectAll();
    canvas.requestRenderAll();
  });
}

export function restoreTextObjectsEditability(canvas: fabric.Canvas) {
  canvas.getObjects().forEach((obj) => ensureTextEditable(obj));
}
