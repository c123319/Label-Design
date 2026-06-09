import { fabric } from 'fabric';

export type AlignDirection = 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV';

function alignObjectToCanvas(
  obj: fabric.Object,
  canvasWidth: number,
  canvasHeight: number,
  dir: AlignDirection,
) {
  const bounds = obj.getBoundingRect(true);
  let targetLeft = bounds.left;
  let targetTop = bounds.top;

  switch (dir) {
    case 'left':
      targetLeft = 0;
      break;
    case 'right':
      targetLeft = canvasWidth - bounds.width;
      break;
    case 'top':
      targetTop = 0;
      break;
    case 'bottom':
      targetTop = canvasHeight - bounds.height;
      break;
    case 'centerH':
      targetLeft = (canvasWidth - bounds.width) / 2;
      break;
    case 'centerV':
      targetTop = (canvasHeight - bounds.height) / 2;
      break;
  }

  obj.set({
    left: (obj.left ?? 0) + (targetLeft - bounds.left),
    top: (obj.top ?? 0) + (targetTop - bounds.top),
  });
}

function alignObjectsRelative(objs: fabric.Object[], dir: AlignDirection) {
  if (dir === 'left') {
    const v = Math.min(...objs.map((o) => o.left || 0));
    objs.forEach((o) => o.set('left', v));
  } else if (dir === 'right') {
    const v = Math.max(...objs.map((o) => (o.left || 0) + (o.getScaledWidth?.() || 0)));
    objs.forEach((o) => o.set('left', v - (o.getScaledWidth?.() || 0)));
  } else if (dir === 'top') {
    const v = Math.min(...objs.map((o) => o.top || 0));
    objs.forEach((o) => o.set('top', v));
  } else if (dir === 'bottom') {
    const v = Math.max(...objs.map((o) => (o.top || 0) + (o.getScaledHeight?.() || 0)));
    objs.forEach((o) => o.set('top', v - (o.getScaledHeight?.() || 0)));
  } else if (dir === 'centerH') {
    const centers = objs.map((o) => (o.left || 0) + (o.getScaledWidth?.() || 0) / 2);
    const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
    objs.forEach((o) => o.set('left', avg - (o.getScaledWidth?.() || 0) / 2));
  } else if (dir === 'centerV') {
    const centers = objs.map((o) => (o.top || 0) + (o.getScaledHeight?.() || 0) / 2);
    const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
    objs.forEach((o) => o.set('top', avg - (o.getScaledHeight?.() || 0) / 2));
  }
}

/**
 * 对齐选中元素：
 * - 单选：相对整个画布对齐
 * - 多选：元素之间互相对齐
 */
export function alignSelection(
  canvas: fabric.Canvas,
  dir: AlignDirection,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  const active = canvas.getActiveObject();
  if (!active) return false;

  let objs: fabric.Object[];

  if (active.type === 'activeSelection') {
    objs = (active as fabric.ActiveSelection).getObjects();
  } else {
    objs = [active];
  }

  if (objs.length === 0) return false;

  if (objs.length === 1) {
    alignObjectToCanvas(objs[0], canvasWidth, canvasHeight, dir);
    objs[0].setCoords();
    canvas.setActiveObject(objs[0]);
  } else {
    alignObjectsRelative(objs, dir);
    objs.forEach((o) => o.setCoords());
    canvas.discardActiveObject();
    const selection = new fabric.ActiveSelection(objs, { canvas });
    canvas.setActiveObject(selection);
  }

  canvas.requestRenderAll();
  return true;
}
