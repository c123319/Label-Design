import { fabric } from 'fabric';
import { FABRIC_CUSTOM_PROPS } from '@/utils/renderTemplate';

let initialized = false;

/** 确保 Fabric 序列化/反序列化包含数据绑定自定义属性 */
export function initFabricCustomProps(): void {
  if (initialized) return;
  initialized = true;

  const extraProps = [...FABRIC_CUSTOM_PROPS];
  const origToObject = fabric.Object.prototype.toObject;
  fabric.Object.prototype.toObject = function toObject(propertiesToInclude?: string[]) {
    return origToObject.call(this, [...(propertiesToInclude ?? []), ...extraProps]);
  };
}
