import { fabric } from 'fabric';
import { FABRIC_CUSTOM_PROPS } from '@/utils/renderTemplate';

let initialized = false;

function applyCustomProps(target: fabric.Object, source: Record<string, unknown>): void {
  FABRIC_CUSTOM_PROPS.forEach((prop) => {
    if (source[prop] !== undefined) {
      (target as unknown as Record<string, unknown>)[prop] = source[prop];
    }
  });
}

/** 确保 Fabric 序列化/反序列化包含数据绑定自定义属性 */
export function initFabricCustomProps(): void {
  if (initialized) return;
  initialized = true;

  const extraProps = [...FABRIC_CUSTOM_PROPS];
  const origToObject = fabric.Object.prototype.toObject;
  fabric.Object.prototype.toObject = function toObject(propertiesToInclude?: string[]) {
    return origToObject.call(this, [...(propertiesToInclude ?? []), ...extraProps]);
  };

  // 反序列化时恢复条码/二维码自定义字段
  type FromObjectFn = (
    object: Record<string, unknown>,
    callback: (obj: fabric.Object) => void,
  ) => void;

  const patchFromObject = (
    klass: { fromObject: FromObjectFn },
  ) => {
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

/** 序列化画布时包含绑定字段 */
export function canvasToJSON(canvas: fabric.Canvas): Record<string, unknown> {
  return canvas.toJSON([...FABRIC_CUSTOM_PROPS]) as Record<string, unknown>;
}
