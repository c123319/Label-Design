export type SidebarTab = 'component' | 'template' | 'material' | 'datasource' | 'print';

export const NAV_ITEMS: { key: SidebarTab; label: string }[] = [
  { key: 'component', label: '组件' },
  { key: 'template', label: '模板' },
  { key: 'material', label: '素材' },
  { key: 'datasource', label: '数据源' },
  { key: 'print', label: '打印设置' },
];
