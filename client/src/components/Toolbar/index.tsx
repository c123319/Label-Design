import { useCallback, useMemo, useState } from 'react';
import { Input, Select, Modal, message, Spin, Empty } from 'antd';
import {
  AppstoreOutlined,
  FileTextOutlined,
  PictureOutlined,
  DatabaseOutlined,
  PrinterOutlined,
  QuestionCircleOutlined,
  DesktopOutlined,
  SearchOutlined,
  UploadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { truncateText } from '@/utils/renderTemplate';
import { useTemplateStore } from '@/hooks/useTemplateStore';
import { templateStoreService } from '@/services/templateStore';
import { useCanvasActions } from './useCanvasActions';
import {
  NAV_ITEMS,
  WARNING_PRESETS,
  MATERIAL_CATEGORIES,
  REGULATORY_ICONS,
  type SidebarTab,
} from './constants';
import './styles.css';

const NAV_ICONS: Record<SidebarTab, React.ReactNode> = {
  component: <AppstoreOutlined />,
  template: <FileTextOutlined />,
  material: <PictureOutlined />,
  datasource: <DatabaseOutlined />,
  print: <PrinterOutlined />,
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

interface ToolbarProps {
  onOpenDataImport?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onOpenDataImport }) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('component');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [templateFilter, setTemplateFilter] = useState('featured');
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('法案标');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrValue, setQrValue] = useState('{{qr_data}}');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('{{barcode_data}}');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { sidebarCollapsed, toggleSidebar, loadFromJSON, setCurrentTemplateId, dataSource } = useEditorStore();
  const actions = useCanvasActions();
  const templateStore = useTemplateStore(activeTab === 'template');

  const filteredEntries = useMemo(() => {
    const byCategory = templateStore.filterByCategory(templateFilter);
    return templateStoreService.search(byCategory, searchKeyword);
  }, [templateStore.entries, templateFilter, searchKeyword]);

  const handleLoadStoreTemplate = useCallback(async (entry: typeof filteredEntries[0]) => {
    setLoadingTemplateId(entry.id);
    try {
      const template = await templateStore.loadTemplate(entry);
      if (template) {
        loadFromJSON(template);
        setCurrentTemplateId(template.id);
        message.success(`已加载: ${template.name}`);
      }
    } finally {
      setLoadingTemplateId(null);
    }
  }, [templateStore, loadFromJSON, setCurrentTemplateId]);

  const renderSectionHeader = (title: string, more?: boolean) => (
    <div className="panel-section-header">
      <span>{title}</span>
      {more && <button type="button" className="panel-more">更多 <RightOutlined /></button>}
    </div>
  );

  const renderComponentPanel = () => (
    <div className="panel-scroll">
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索组件"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        className="panel-search"
        allowClear
      />

      {renderSectionHeader('文本')}
      <div className="panel-grid panel-grid-2">
        <button type="button" className="panel-card" onClick={() => actions.addText()}>
          <span className="panel-text-preview">T</span>
          <span>单行文本</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addText({ text: '多行文本\n第二行' })}>
          <span className="panel-text-preview">¶</span>
          <span>多行文本</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addHeading(1)}>
          <span className="panel-text-preview h1">H</span>
          <span>标题</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addTextbox()}>
          <span className="panel-text-preview">□</span>
          <span>文本框</span>
        </button>
      </div>

      {renderSectionHeader('条码')}
      <div className="panel-grid panel-grid-2">
        <button type="button" className="panel-card" onClick={() => setBarcodeModalOpen(true)}>
          <span className="panel-code-preview">|||</span>
          <span>一维码</span>
        </button>
        <button type="button" className="panel-card" onClick={() => setQrModalOpen(true)}>
          <span className="panel-code-preview qr">▣</span>
          <span>二维码</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addQRCode('DataMatrix')}>
          <span className="panel-code-preview">DM</span>
          <span>DataMatrix</span>
        </button>
        <button type="button" className="panel-card" onClick={() => actions.addQRCode('PDF417-DEMO')}>
          <span className="panel-code-preview">PDF</span>
          <span>PDF417</span>
        </button>
      </div>

      {renderSectionHeader('图形', true)}
      <div className="panel-grid panel-grid-4">
        <button type="button" className="panel-shape-btn" title="直线" onClick={() => actions.addLine()}><LinePreview /></button>
        <button type="button" className="panel-shape-btn" title="箭头" onClick={() => actions.addArrow('simple')}><ArrowPreview type="simple" /></button>
        <button type="button" className="panel-shape-btn" title="矩形" onClick={() => actions.addRect()}><ShapePreview type="rect" /></button>
        <button type="button" className="panel-shape-btn" title="圆角矩形" onClick={() => actions.addRect({ rx: 8 })}><ShapePreview type="roundRect" /></button>
        <button type="button" className="panel-shape-btn" title="圆形" onClick={() => actions.addCircle()}><ShapePreview type="circle" /></button>
        <button type="button" className="panel-shape-btn" title="多边形" onClick={() => actions.addPolygon(6)}><ShapePreview type="hexagon" /></button>
        <button type="button" className="panel-shape-btn" title="星形" onClick={() => actions.addStar()}><ShapePreview type="star" /></button>
        <button type="button" className="panel-shape-btn" title="图片" onClick={actions.triggerImageUpload}><UploadOutlined style={{ fontSize: 20 }} /></button>
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
        loading={templateStore.loading}
        options={templateStore.categories.map((c) => ({
          value: c.code,
          label: c.name,
        }))}
      />
      {templateStore.loading ? (
        <div className="template-store-loading"><Spin tip="加载模板库..." /></div>
      ) : templateStore.error ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={templateStore.error}
        >
          <button type="button" className="panel-more" onClick={() => templateStore.reload()}>
            重新加载
          </button>
        </Empty>
      ) : (
        <div className="template-list">
          {filteredEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="template-card"
              disabled={loadingTemplateId === entry.id}
              onClick={() => handleLoadStoreTemplate(entry)}
            >
              <div className="template-thumb">
                <img
                  src={templateStore.getThumbnailUrl(entry)}
                  alt={entry.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="template-thumb-fallback">{entry.name.slice(0, 2)}</span>
              </div>
              <div className="template-info">
                <div className="template-name">{entry.name}</div>
                <div className="template-size">
                  {entry.width}×{entry.height}{entry.unit}
                  {entry.featured && <span className="template-badge">精选</span>}
                </div>
              </div>
            </button>
          ))}
          {filteredEntries.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配模板" />
          )}
        </div>
      )}
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
      {renderSectionHeader('合规标识')}
      <div className="panel-grid panel-grid-4 icon-grid">
        {REGULATORY_ICONS
          .filter((icon) => !searchKeyword || icon.toLowerCase().includes(searchKeyword.toLowerCase()))
          .map((icon) => (
            <button key={icon} type="button" className="icon-item" onClick={() => actions.addIconText(icon)}>
              {icon}
            </button>
          ))}
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

  const renderDatasourcePanel = () => (
    <div className="panel-scroll datasource-panel">
      {dataSource ? (
        <div className="datasource-panel-loaded">
          <div className="datasource-summary-card">
            <div className="datasource-summary-icon">
              <DatabaseOutlined />
            </div>
            <div className="datasource-summary-body">
              <div className="datasource-summary-label">当前数据源</div>
              <div className="datasource-file" title={dataSource.fileName || '本地数据'}>
                {dataSource.fileName || '本地数据'}
              </div>
              <div className="datasource-meta">
                <span className="datasource-stat">{dataSource.totalRows} 条</span>
                <span className="datasource-stat">{dataSource.fields.length} 个字段</span>
                {dataSource.fileType && (
                  <span className="datasource-stat datasource-stat-type">
                    {dataSource.fileType.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="datasource-fields-section">
            <div className="datasource-fields-header">
              <span>字段列表</span>
              <span className="datasource-fields-count">{dataSource.fields.length}</span>
            </div>
            <div className="datasource-fields">
              {dataSource.fields.map((f) => (
                <div key={f.fieldCode} className="datasource-field-row">
                  <span className="datasource-field-name" title={f.fieldName}>
                    {f.fieldName}
                  </span>
                  {f.sampleValue ? (
                    <span className="datasource-field-sample" title={String(f.sampleValue)}>
                      {truncateText(String(f.sampleValue), 24)}
                    </span>
                  ) : (
                    <span className="datasource-field-empty">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="datasource-action-btn"
            onClick={() => onOpenDataImport?.()}
          >
            <UploadOutlined />
            <span>重新上传</span>
          </button>
        </div>
      ) : (
        <div className="datasource-empty">
          <div className="datasource-empty-icon">
            <DatabaseOutlined />
          </div>
          <div className="panel-placeholder-title">暂无数据源</div>
          <div className="panel-placeholder-desc">
            上传 Excel 或 CSV 文件，将数据字段绑定到标签元素。
          </div>
          <button
            type="button"
            className="datasource-action-btn datasource-action-btn-primary"
            onClick={() => onOpenDataImport?.()}
          >
            <UploadOutlined />
            <span>上传数据文件</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderPrintPanel = () => (
    <div className="panel-scroll">
      <div className="panel-placeholder" style={{ minHeight: 200 }}>
        <div className="panel-placeholder-title">打印设置</div>
        <div className="panel-placeholder-desc">配置打印机、纸张尺寸、边距和出血等打印参数。</div>
      </div>
    </div>
  );

  const renderPanel = () => {
    switch (activeTab) {
      case 'component': return renderComponentPanel();
      case 'template': return renderTemplatePanel();
      case 'material': return renderMaterialPanel();
      case 'datasource': return renderDatasourcePanel();
      case 'print': return renderPrintPanel();
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
