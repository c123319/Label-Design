import { useCallback, useEffect, useState } from 'react';
import { Input, Select, Modal, message } from 'antd';
import {
  PlusCircleOutlined,
  AppstoreOutlined,
  FontSizeOutlined,
  BlockOutlined,
  PictureOutlined,
  StarOutlined,
  QuestionCircleOutlined,
  DesktopOutlined,
  SearchOutlined,
  UploadOutlined,
  FilePdfOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { useFilesystemStore } from '@/store/useFilesystemStore';
import { templateApi } from '@/services/api';
import { fileSystemStorage } from '@/services/fileSystemStorage';
import type { ITemplate } from '@shared/types/template';
import { useCanvasActions } from './useCanvasActions';
import {
  NAV_ITEMS,
  WARNING_PRESETS,
  MATERIAL_CATEGORIES,
  REGULATORY_ICONS,
  TEMPLATE_PRESETS,
  type SidebarTab,
} from './constants';
import './styles.css';

const NAV_ICONS: Record<SidebarTab, React.ReactNode> = {
  add: <PlusCircleOutlined />,
  template: <AppstoreOutlined />,
  text: <FontSizeOutlined />,
  element: <BlockOutlined />,
  material: <PictureOutlined />,
  icon: <StarOutlined />,
};

const LinePreview = ({ dashed, thick, diagonal }: { dashed?: boolean; thick?: boolean; diagonal?: boolean }) => (
  <svg viewBox="0 0 48 24" className="shape-preview">
    <line
      x1={diagonal ? 4 : 4}
      y1={diagonal ? 20 : 12}
      x2={diagonal ? 44 : 44}
      y2={diagonal ? 4 : 12}
      stroke="#595959"
      strokeWidth={thick ? 3 : 1.5}
      strokeDasharray={dashed ? '4 3' : undefined}
    />
  </svg>
);

const ArrowPreview = ({ type }: { type: 'simple' | 'block' | 'double' | 'circle' }) => (
  <svg viewBox="0 0 48 24" className="shape-preview">
    {type === 'circle' && <circle cx="8" cy="12" r="4" fill="none" stroke="#595959" strokeWidth="1.5" />}
    <line x1={type === 'circle' ? 12 : 4} y1="12" x2="36" y2="12" stroke="#595959" strokeWidth={type === 'block' ? 3 : 1.5} />
    <polygon points="36,8 44,12 36,16" fill="#595959" />
    {type === 'double' && <polygon points="12,8 4,12 12,16" fill="#595959" />}
  </svg>
);

const ShapePreview = ({ type }: { type: string }) => {
  const common = { stroke: '#595959', strokeWidth: 1.5, fill: type.startsWith('fill') ? '#595959' : 'none' };
  return (
    <svg viewBox="0 0 48 48" className="shape-preview">
      {type === 'rect' && <rect x="10" y="14" width="28" height="20" {...common} />}
      {type === 'circle' && <circle cx="24" cy="24" r="12" {...common} />}
      {type === 'roundRect' && <rect x="10" y="14" width="28" height="20" rx="6" {...common} />}
      {type === 'fillRect' && <rect x="10" y="14" width="28" height="20" fill="#595959" />}
      {type === 'fillRoundRect' && <rect x="10" y="14" width="28" height="20" rx="6" fill="#595959" />}
      {type === 'triangle' && <polygon points="24,10 38,36 10,36" fill="#595959" />}
      {type === 'hexagon' && <polygon points="24,8 36,16 36,32 24,40 12,32 12,16" fill="#595959" />}
      {type === 'fillCircle' && <circle cx="24" cy="24" r="12" fill="#595959" />}
      {type === 'star' && (
        <polygon
          points="24,6 28,18 40,18 30,26 34,38 24,30 14,38 18,26 8,18 20,18"
          fill="#595959"
        />
      )}
    </svg>
  );
};

const Toolbar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('add');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [templateFilter, setTemplateFilter] = useState('featured');
  const [templates, setTemplates] = useState<ITemplate[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('法案标');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('{{qr_data}}');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('{{barcode_data}}');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { sidebarCollapsed, toggleSidebar, loadFromJSON, setCurrentTemplateId } = useEditorStore();
  const { isConnected } = useFilesystemStore();
  const actions = useCanvasActions();

  const loadTemplates = useCallback(async () => {
    const list: ITemplate[] = [];
    if (isConnected) {
      try {
        const local = await fileSystemStorage.list();
        list.push(...local);
      } catch { /* ignore */ }
    }
    try {
      const res = await templateApi.list();
      const cloud = (res as { data?: ITemplate[] }).data || (Array.isArray(res) ? res : []);
      list.push(...cloud);
    } catch { /* ignore */ }
    setTemplates(list);
  }, [isConnected]);

  useEffect(() => {
    if (activeTab === 'template') loadTemplates();
  }, [activeTab, loadTemplates]);

  const handleLoadTemplate = (template: ITemplate) => {
    loadFromJSON(template);
    setCurrentTemplateId(template.id);
    message.success(`已加载: ${template.name}`);
  };

  const renderSectionHeader = (title: string, more?: boolean) => (
    <div className="panel-section-header">
      <span>{title}</span>
      {more && <button type="button" className="panel-more">更多 <RightOutlined /></button>}
    </div>
  );

  const renderAddPanel = () => (
    <div className="panel-scroll">
      {renderSectionHeader('添加文件')}
      <div className="panel-grid panel-grid-2">
        <button type="button" className="panel-card" onClick={actions.triggerImageUpload}>
          <UploadOutlined className="panel-card-icon" />
          <span>上传图片</span>
        </button>
        <button type="button" className="panel-card" onClick={() => message.info('PDF 上传功能开发中')}>
          <FilePdfOutlined className="panel-card-icon" />
          <span>上传PDF</span>
        </button>
      </div>

      {renderSectionHeader('添加文字')}
      <div className="panel-grid panel-grid-3">
        <button type="button" className="panel-card" onClick={() => actions.addHeading(1)}>
          <span className="panel-text-preview h1">H1</span>
          <span>标题</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addHeading(2)}>
          <span className="panel-text-preview h2">H2</span>
          <span>副标题</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addText()}>
          <span className="panel-text-preview">Tt</span>
          <span>文本</span>
        </button>
      </div>

      {renderSectionHeader('添加组件')}
      <div className="panel-grid panel-grid-2">
        <button type="button" className="panel-card" onClick={() => setBarcodeModalOpen(true)}>
          <span className="panel-code-preview">|||</span>
          <span>条形码</span>
        </button>
        <button type="button" className="panel-card" onClick={() => setQrModalOpen(true)}>
          <span className="panel-code-preview qr">▣</span>
          <span>二维码</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addQRCode('PDF417-DEMO')}>
          <span className="panel-code-preview">PDF</span>
          <span>PDF417</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addQRCode('DataMatrix')}>
          <span className="panel-code-preview">DM</span>
          <span>DataMatrix</span>
        </button>
      </div>

      {renderSectionHeader('线条', true)}
      <div className="panel-grid panel-grid-4">
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine({ dashed: true })}><LinePreview dashed /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine()}><LinePreview /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine({ width: 4 })}><LinePreview thick /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine({ diagonal: true })}><LinePreview diagonal /></button>
      </div>

      {renderSectionHeader('箭头', true)}
      <div className="panel-grid panel-grid-4">
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('simple')}><ArrowPreview type="simple" /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('block')}><ArrowPreview type="block" /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('double')}><ArrowPreview type="double" /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('circle')}><ArrowPreview type="circle" /></button>
      </div>

      {renderSectionHeader('形状', true)}
      <div className="panel-grid panel-grid-3">
        {([
          ['rect', () => actions.addRect()],
          ['circle', () => actions.addCircle()],
          ['roundRect', () => actions.addRect({ rx: 8 })],
          ['fillRect', () => actions.addRect({ fill: '#333333', stroke: '#333333' })],
          ['fillRoundRect', () => actions.addRect({ fill: '#333333', stroke: '#333333', rx: 8 })],
          ['triangle', () => actions.addTriangle()],
          ['hexagon', () => actions.addPolygon(6)],
          ['fillCircle', () => actions.addCircle({ fill: '#333333' })],
          ['star', () => actions.addStar()],
        ] as const).map(([type, fn]) => (
          <button key={type} type="button" className="panel-shape-btn" onClick={fn}>
            <ShapePreview type={type} />
          </button>
        ))}
      </div>
    </div>
  );

  const renderTemplatePanel = () => (
    <div className="panel-scroll">
      <Input
        prefix={<SearchOutlined />}
        placeholder="请输入关键词搜索"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        className="panel-search"
        allowClear
      />
      <Select
        className="panel-select"
        value={templateFilter}
        onChange={setTemplateFilter}
        options={[
          { value: 'featured', label: '精选' },
          { value: 'recent', label: '最近使用' },
          { value: 'mine', label: '我的模板' },
        ]}
      />
      <div className="template-list">
        {templates
          .filter((t) => !searchKeyword || t.name?.includes(searchKeyword))
          .map((t) => (
            <button key={t.id} type="button" className="template-card" onClick={() => handleLoadTemplate(t)}>
              <div className="template-thumb">
                <span>{t.name?.slice(0, 2) || '模板'}</span>
              </div>
              <div className="template-info">
                <div className="template-name">{t.name || '未命名模板'}</div>
                <div className="template-size">{t.pages?.[0]?.width || 0}×{t.pages?.[0]?.height || 0}px</div>
              </div>
            </button>
          ))}
        {TEMPLATE_PRESETS
          .filter((t) => !searchKeyword || t.name.includes(searchKeyword))
          .map((t) => (
            <button key={t.name} type="button" className="template-card" onClick={() => message.info('请从模板管理创建或使用已有模板')}>
              <div className="template-thumb preset">
                <span>{t.name.slice(0, 2)}</span>
              </div>
              <div className="template-info">
                <div className="template-name">{t.name}</div>
                <div className="template-size">{t.size}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  );

  const renderTextPanel = () => (
    <div className="panel-scroll">
      {renderSectionHeader('添加文字')}
      <div className="panel-grid panel-grid-3">
        <button type="button" className="panel-card" onClick={() => actions.addHeading(1)}>
          <span className="panel-text-preview h1">H1</span>
          <span>标题</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addHeading(2)}>
          <span className="panel-text-preview h2">H2</span>
          <span>副标题</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addText()}>
          <span className="panel-text-preview">Tt</span>
          <span>文本</span>
        </button>
      </div>

      {renderSectionHeader('跨境警示语')}
      <div className="warning-list">
        {WARNING_PRESETS.map((item) => (
          <button
            key={item.title}
            type="button"
            className="warning-item"
            onClick={() => actions.addPresetText(item.text)}
          >
            <div className="warning-title">⚠ {item.title}</div>
            <div className="warning-text">{item.text}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderElementPanel = () => (
    <div className="panel-scroll">
      {renderSectionHeader('线条')}
      <div className="panel-grid panel-grid-4">
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine({ dashed: true })}><LinePreview dashed /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine()}><LinePreview /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine({ width: 4 })}><LinePreview thick /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addLine({ diagonal: true })}><LinePreview diagonal /></button>
      </div>

      {renderSectionHeader('箭头')}
      <div className="panel-grid panel-grid-4">
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('simple')}><ArrowPreview type="simple" /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('block')}><ArrowPreview type="block" /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('double')}><ArrowPreview type="double" /></button>
        <button type="button" className="panel-shape-btn" onClick={() => actions.addArrow('circle')}><ArrowPreview type="circle" /></button>
      </div>

      {renderSectionHeader('形状')}
      <div className="panel-grid panel-grid-4">
        {([
          ['rect', () => actions.addRect()],
          ['circle', () => actions.addCircle()],
          ['roundRect', () => actions.addRect({ rx: 8 })],
          ['fillRect', () => actions.addRect({ fill: '#333333', stroke: '#333333' })],
          ['fillRoundRect', () => actions.addRect({ fill: '#333333', stroke: '#333333', rx: 8 })],
          ['triangle', () => actions.addTriangle()],
          ['hexagon', () => actions.addPolygon(6)],
          ['fillCircle', () => actions.addCircle({ fill: '#333333' })],
          ['star', () => actions.addStar()],
        ] as const).map(([type, fn]) => (
          <button key={type} type="button" className="panel-shape-btn" onClick={fn}>
            <ShapePreview type={type} />
          </button>
        ))}
      </div>
    </div>
  );

  const renderMaterialPanel = () => (
    <div className="panel-scroll">
      <Input
        prefix={<SearchOutlined />}
        placeholder="输入关键词搜索"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        className="panel-search"
        allowClear
      />
      <button
        type="button"
        className="category-header"
        onClick={() => setExpandedCategory(expandedCategory === '法案标' ? null : '法案标')}
      >
        <span>法案标</span>
        <RightOutlined className={expandedCategory === '法案标' ? 'expanded' : ''} />
      </button>
      {expandedCategory === '法案标' && (
        <div className="panel-grid panel-grid-3 material-icons">
          {['⚡', '♻', '⚠', '🚫', '📦', '🏷'].map((icon) => (
            <button key={icon} type="button" className="panel-shape-btn" onClick={() => actions.addIconText(icon)}>
              <span style={{ fontSize: 22 }}>{icon}</span>
            </button>
          ))}
        </div>
      )}
      <div className="category-list">
        {MATERIAL_CATEGORIES.filter((c) => !searchKeyword || c.includes(searchKeyword)).map((cat) => (
          <button key={cat} type="button" className="category-item">
            <span>{cat}</span>
            <RightOutlined />
          </button>
        ))}
      </div>
    </div>
  );

  const renderIconPanel = () => (
    <div className="panel-scroll">
      <Input
        prefix={<SearchOutlined />}
        placeholder="输入关键词搜索"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        className="panel-search"
        allowClear
      />
      <button type="button" className="category-header">
        <span>通用</span>
        <RightOutlined className="expanded" />
      </button>
      <div className="panel-grid panel-grid-4 icon-grid">
        {REGULATORY_ICONS
          .filter((icon) => !searchKeyword || icon.toLowerCase().includes(searchKeyword.toLowerCase()))
          .map((icon) => (
            <button key={icon} type="button" className="icon-item" onClick={() => actions.addIconText(icon)}>
              {icon}
            </button>
          ))}
      </div>
    </div>
  );

  const renderPanel = () => {
    switch (activeTab) {
      case 'add': return renderAddPanel();
      case 'template': return renderTemplatePanel();
      case 'text': return renderTextPanel();
      case 'element': return renderElementPanel();
      case 'material': return renderMaterialPanel();
      case 'icon': return renderIconPanel();
      default: return null;
    }
  };

  return (
    <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}>
      <input ref={actions.fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={actions.handleImageUpload} />

      <nav className="sidebar-nav">
        <div className="sidebar-nav-main">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === item.key && !sidebarCollapsed) {
                  toggleSidebar();
                } else {
                  setActiveTab(item.key);
                  if (sidebarCollapsed) toggleSidebar();
                }
              }}
            >
              <span className="nav-icon">{NAV_ICONS[item.key]}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-nav-bottom">
          <button type="button" className="nav-item" onClick={() => setShortcutsOpen(true)}>
            <span className="nav-icon"><DesktopOutlined /></span>
            <span className="nav-label">快捷键</span>
          </button>
          <button type="button" className="nav-item" onClick={() => message.info('帮助文档开发中')}>
            <span className="nav-icon"><QuestionCircleOutlined /></span>
            <span className="nav-label">帮助</span>
          </button>
        </div>
      </nav>

      {!sidebarCollapsed && (
        <div className="sidebar-panel">
          {renderPanel()}
        </div>
      )}

      <Modal title="添加二维码" open={qrModalOpen} onOk={() => { actions.addQRCode(qrValue); setQrModalOpen(false); }} onCancel={() => setQrModalOpen(false)} okText="添加" width={400}>
        <div style={{ padding: '12px 0' }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>内容（支持 {'{{占位符}}'}）</label>
          <Input value={qrValue} onChange={(e) => setQrValue(e.target.value)} placeholder="输入 QR 码内容" />
        </div>
      </Modal>

      <Modal title="添加条形码" open={barcodeModalOpen} onOk={() => { actions.addBarcode(barcodeValue); setBarcodeModalOpen(false); }} onCancel={() => setBarcodeModalOpen(false)} okText="添加" width={400}>
        <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>内容（支持 {'{{占位符}}'}）</label>
            <Input value={barcodeValue} onChange={(e) => setBarcodeValue(e.target.value)} placeholder="输入条码内容" />
          </div>
        </div>
      </Modal>

      <Modal title="快捷键" open={shortcutsOpen} onCancel={() => setShortcutsOpen(false)} footer={null} width={360}>
        <div className="shortcuts-list">
          {[
            ['Ctrl + Z', '撤销'], ['Ctrl + Y', '重做'], ['Ctrl + C', '复制'],
            ['Ctrl + V', '粘贴'], ['Ctrl + D', '复制对象'], ['Ctrl + A', '全选'],
            ['Delete', '删除'], ['V', '选择工具'], ['H', '平移工具'],
          ].map(([key, desc]) => (
            <div key={key} className="shortcut-row">
              <kbd>{key}</kbd><span>{desc}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Toolbar;
