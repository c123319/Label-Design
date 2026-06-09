import { createCanvas, loadImage, Canvas as NodeCanvas, Image as NodeImage } from 'canvas';
import { fabric } from './fabricLib';
import { FABRIC_CUSTOM_PROPS } from './renderTemplate';

let initialized = false;

function applyCustomProps(target: fabric.Object, source: Record<string, unknown>): void {
  FABRIC_CUSTOM_PROPS.forEach((prop) => {
    if (source[prop] !== undefined) {
      (target as unknown as Record<string, unknown>)[prop] = source[prop];
    }
  });
}

/** 初始化 Fabric.js Node 环境 */
export function initFabricNode(): void {
  if (initialized) return;
  initialized = true;

  (fabric as unknown as { nodeCanvas: typeof createCanvas }).nodeCanvas = createCanvas;

  type FromObjectFn = (
    object: Record<string, unknown>,
    callback: (obj: fabric.Object) => void,
  ) => void;

  const patchFromObject = (klass: { fromObject: FromObjectFn }) => {
    const orig = klass.fromObject;
    klass.fromObject = function fromObject(
      object: Record<string, unknown>,
      callback: (obj: fabric.Object) => void,
    ) {
      return orig.call(this, object, (obj: fabric.Object) => {
        applyCustomProps(obj, object);
        callback(obj);
      });
    };
  };

  patchFromObject(fabric.Image as unknown as { fromObject: FromObjectFn });
  patchFromObject(fabric.IText as unknown as { fromObject: FromObjectFn });
  patchFromObject(fabric.Textbox as unknown as { fromObject: FromObjectFn });
}

export type FabricCustomObject = fabric.Object & {
  elementType?: 'barcode' | 'qrcode';
  barcodeValue?: string;
  qrValue?: string;
  barcodeFormat?: string;
};

export function loadFromJSON(
  canvas: fabric.StaticCanvas,
  json: { objects?: unknown[] },
): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.loadFromJSON(json, () => resolve(), reject);
  });
}

export async function replaceImageFromBuffer(
  img: fabric.Image,
  buffer: Buffer,
): Promise<void> {
  const nodeImg = await loadImage(buffer);
  img.setElement(nodeImg as unknown as HTMLImageElement);
  img.set({ width: nodeImg.width, height: nodeImg.height });
}

export function getCanvasBuffer(
  nodeCanvas: NodeCanvas,
  width: number,
  height: number,
  multiplier = 2,
): Buffer {
  if (multiplier <= 1) {
    return nodeCanvas.toBuffer('image/png');
  }
  const scaled = createCanvas(Math.round(width * multiplier), Math.round(height * multiplier));
  const ctx = scaled.getContext('2d');
  ctx.drawImage(nodeCanvas as unknown as NodeImage, 0, 0, scaled.width, scaled.height);
  return scaled.toBuffer('image/png');
}
