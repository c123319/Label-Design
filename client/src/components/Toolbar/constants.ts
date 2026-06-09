export type SidebarTab = 'add' | 'template' | 'text' | 'element' | 'material' | 'icon';

export const NAV_ITEMS: { key: SidebarTab; label: string }[] = [
  { key: 'add', label: '添加' },
  { key: 'template', label: '模板' },
  { key: 'text', label: '文字' },
  { key: 'element', label: '元素' },
  { key: 'material', label: '素材' },
  { key: 'icon', label: '图标' },
];

export const WARNING_PRESETS = [
  {
    title: '跨境警示语 1',
    text: 'WARNING: TO AVOID DANGER OF SUFFOCATION, KEEP THIS PLASTIC BAG AWAY FROM BABIES AND CHILDREN.\n警告：为了避免窒息的危险，请将此塑料袋远离婴儿和儿童。',
  },
  {
    title: '跨境警示语 2',
    text: 'Warning: To avoid danger of suffocation, keep this bag away from babies and children.\n警告：为了避免窒息的危险，请将此塑料袋远离婴儿和儿童。',
  },
  {
    title: 'FCC 警示语',
    text: 'WARNING: This device complies with part 15 of the FCC Rules.\n警告：本设备符合 FCC 规则第 15 部分。',
  },
  {
    title: '美国含锐利边缘玩具',
    text: 'CAUTION: Assembly kit contains parts with sharp edges.\n注意：组装套件中包含具有锋利边缘的零件。',
  },
  {
    title: '加拿大玩具防窒息',
    text: 'PLASTIC BAGS CAN BE DANGEROUS. TO AVOID DANGER OF SUFFOCATION, KEEP THIS BAG AWAY FROM BABIES AND CHILDREN.\n塑料袋是危险的。为避免窒息的危险，请将其放在远离婴儿和儿童。',
  },
];

export const MATERIAL_CATEGORIES = [
  '警示语', '强制性', '禁止性', '法案相关属性', '基本限制',
  '抽象形状', '几何形状', '月亮形状', '闪电', '手绘分隔符',
  '箭头', '对话气泡', '公章', '头像', '人物',
];

export const REGULATORY_ICONS = [
  'CE', 'UKCA', 'KC', 'E-REP', 'UK-REP', 'EC REP', 'US REP',
  'CPC', 'FDA', 'ETL', 'UL', 'RoHS', 'PAP', '01', '02', '04',
  '21', '22', 'WEEE', 'Triman', 'FSC', 'TUV', 'GS', 'CCC',
];

export const TEMPLATE_PRESETS = [
  { name: '通用标签模板', size: '100×100mm' },
  { name: '物流面单', size: '100×150mm' },
  { name: '商品条码标签', size: '60×40mm' },
  { name: '食品合格证', size: '80×60mm' },
  { name: '跨境警示标签', size: '100×70mm' },
  { name: '仓储库位标签', size: '50×30mm' },
];
