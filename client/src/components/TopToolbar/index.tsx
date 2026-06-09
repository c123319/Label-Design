import { Dropdown, Tooltip } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  CopyOutlined,
  SnippetsOutlined,
  DeleteOutlined,
  GroupOutlined,
  UngroupOutlined,
  AppstoreOutlined,
  SelectOutlined,
  DragOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  LockOutlined,
  UnlockOutlined,
  RotateRightOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import { alignSelection } from '@/utils/alignObjects';
import './styles.css';

const AlignVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="3" width="14" height="1.5" />
    <rect x="5" y="6.5" width="6" height="6" rx="0.5" />
    <rect x="1" y="13.5" width="14" height="1.5" />
  </svg>
);

const TopToolbar: React.FC = () => {
  const {
    activeObject, activeObjects, canvas, undo, redo,
    copySelected, pasteObject, deleteSelected,
    groupSelected, ungroupSelected, showGrid, toggleGrid,
    canvasTool, setCanvasTool, templateSize, saveHistory,
  } = useEditorStore();

  const hasSelection = !!activeObject;
  const hasMultiple = activeObjects.length > 1;
  const isGroup = activeObject?.type === 'group';
  const isLocked = !!(activeObject as fabric.Object & { lockMovementX?: boolean })?.lockMovementX;

  const align = (dir: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV') => {
    if (!canvas) return;
    if (alignSelection(canvas, dir, templateSize.width, templateSize.height)) {
      saveHistory();
    }
  };

  const toggleLock = () => {
    if (!activeObject || !canvas) return;
    const locked = !isLocked;
    activeObject.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      selectable: !locked,
    });
    canvas.renderAll();
    saveHistory();
  };

  const rotate90 = () => {
    if (!activeObject || !canvas) return;
    const angle = ((activeObject.angle ?? 0) + 90) % 360;
    activeObject.set('angle', angle);
    canvas.renderAll();
    saveHistory();
  };

  const alignMenuItems = [
    { key: 'left', label: '左对齐', icon: <AlignLeftOutlined />, onClick: () => align('left') },
    { key: 'centerH', label: '水平居中', icon: <AlignCenterOutlined />, onClick: () => align('centerH') },
    { key: 'right', label: '右对齐', icon: <AlignRightOutlined />, onClick: () => align('right') },
    { type: 'divider' as const },
    { key: 'top', label: '上对齐', icon: <VerticalAlignTopOutlined />, onClick: () => align('top') },
    { key: 'centerV', label: '垂直居中', icon: <AlignVIcon />, onClick: () => align('centerV') },
    { key: 'bottom', label: '下对齐', icon: <VerticalAlignBottomOutlined />, onClick: () => align('bottom') },
  ];

  const orderMenuItems = [
    {
      key: 'up',
      label: '上移一层',
      icon: <ArrowUpOutlined />,
      disabled: !hasSelection,
      onClick: () => { canvas?.bringForward(activeObject!); canvas?.renderAll(); },
    },
    {
      key: 'down',
      label: '下移一层',
      icon: <ArrowDownOutlined />,
      disabled: !hasSelection,
      onClick: () => { canvas?.sendBackwards(activeObject!); canvas?.renderAll(); },
    },
  ];

  return (
    <div className="top-toolbar">
      <div className="tool-group">
        <Tooltip title="撤销 Ctrl+Z"><button type="button" className="tool-btn" onClick={undo}><UndoOutlined /></button></Tooltip>
        <Tooltip title="重做 Ctrl+Y"><button type="button" className="tool-btn" onClick={redo}><RedoOutlined /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        <Tooltip title="删除 Delete">
          <button type="button" className="tool-btn danger" onClick={deleteSelected} disabled={!hasSelection}><DeleteOutlined /></button>
        </Tooltip>
        <Dropdown menu={{ items: alignMenuItems }} disabled={!hasSelection}>
          <Tooltip title="对齐">
            <button type="button" className="tool-btn" disabled={!hasSelection}><AlignCenterOutlined /></button>
          </Tooltip>
        </Dropdown>
        <Dropdown menu={{ items: orderMenuItems }} disabled={!hasSelection}>
          <Tooltip title="排序">
            <button type="button" className="tool-btn" disabled={!hasSelection}><ArrowUpOutlined /></button>
          </Tooltip>
        </Dropdown>
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        <Tooltip title="组合 Ctrl+G"><button type="button" className="tool-btn" onClick={groupSelected} disabled={!hasMultiple}><GroupOutlined /></button></Tooltip>
        <Tooltip title="取消组合"><button type="button" className="tool-btn" onClick={ungroupSelected} disabled={!isGroup}><UngroupOutlined /></button></Tooltip>
        <Tooltip title={isLocked ? '解锁' : '锁定'}>
          <button type="button" className={`tool-btn ${isLocked ? 'active' : ''}`} onClick={toggleLock} disabled={!hasSelection}>
            {isLocked ? <UnlockOutlined /> : <LockOutlined />}
          </button>
        </Tooltip>
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        <Tooltip title="复制 Ctrl+C"><button type="button" className="tool-btn" onClick={copySelected} disabled={!hasSelection}><CopyOutlined /></button></Tooltip>
        <Tooltip title="粘贴 Ctrl+V"><button type="button" className="tool-btn" onClick={pasteObject}><SnippetsOutlined /></button></Tooltip>
        <Tooltip title="旋转 90°"><button type="button" className="tool-btn" onClick={rotate90} disabled={!hasSelection}><RotateRightOutlined /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        <Tooltip title="选中工具 (V)">
          <button type="button" className={canvasTool === 'select' ? 'tool-btn active' : 'tool-btn'} onClick={() => setCanvasTool('select')}>
            <SelectOutlined />
          </button>
        </Tooltip>
        <Tooltip title="拖拽工具 (H)">
          <button type="button" className={canvasTool === 'pan' ? 'tool-btn active' : 'tool-btn'} onClick={() => setCanvasTool('pan')}>
            <DragOutlined />
          </button>
        </Tooltip>
        <Tooltip title={showGrid ? '隐藏网格' : '显示网格'}>
          <button type="button" className={showGrid ? 'tool-btn active' : 'tool-btn'} onClick={() => toggleGrid()}>
            <AppstoreOutlined />
          </button>
        </Tooltip>
        <Dropdown menu={{ items: [{ key: 'help', label: '快捷键说明' }] }}>
          <button type="button" className="tool-btn"><MoreOutlined /></button>
        </Dropdown>
      </div>
    </div>
  );
};

export default TopToolbar;
