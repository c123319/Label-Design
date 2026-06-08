import { Tooltip } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  CopyOutlined,
  SnippetsOutlined,
  DeleteOutlined,
  GroupOutlined,
  UngroupOutlined,
  AppstoreOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { fabric } from 'fabric';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

/** 垂直居中 icon */
const AlignVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="3" width="14" height="1.5" /><rect x="5" y="6.5" width="6" height="6" rx="0.5" /><rect x="1" y="13.5" width="14" height="1.5" />
  </svg>
);

const TopToolbar: React.FC = () => {
  const {
    canvas, activeObject, activeObjects, undo, redo,
    copySelected, pasteObject, deleteSelected, duplicateSelected,
    groupSelected, ungroupSelected, showGrid, toggleGrid,
  } = useEditorStore();

  const hasSelection = !!activeObject;
  const hasMultiple = activeObjects.length > 1;
  const isGroup = activeObject?.type === 'group';

  // ── 对齐 ──
  const getActiveSelection = () => {
    if (!canvas) return null;
    const active = canvas.getActiveObject();
    if (active?.type === 'activeSelection') return active as fabric.ActiveSelection;
    return null;
  };

  const align = (dir: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV') => {
    const sel = getActiveSelection();
    if (!sel || !canvas) return;
    const objs = sel.getObjects();
    if (objs.length < 2) return;

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

    canvas.discardActiveObject();
    objs.forEach((o) => canvas!.setActiveObject(o));
    canvas.renderAll();
  };

  return (
    <div className="top-toolbar">
      {/* 撤销重做 */}
      <div className="tool-group">
        <Tooltip title="撤销 Ctrl+Z"><button className="tool-btn" onClick={undo}><UndoOutlined /></button></Tooltip>
        <Tooltip title="重做 Ctrl+Y"><button className="tool-btn" onClick={redo}><RedoOutlined /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      {/* 编辑操作 */}
      <div className="tool-group">
        <Tooltip title="复制 Ctrl+C"><button className="tool-btn" onClick={copySelected} disabled={!hasSelection}><CopyOutlined /></button></Tooltip>
        <Tooltip title="粘贴 Ctrl+V"><button className="tool-btn" onClick={pasteObject}><SnippetsOutlined /></button></Tooltip>
        <Tooltip title="删除 Delete"><button className="tool-btn danger" onClick={deleteSelected} disabled={!hasSelection}><DeleteOutlined /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      {/* 对齐 */}
      <div className="tool-group">
        <span className="group-label">对齐</span>
        <Tooltip title="左对齐"><button className="tool-btn" onClick={() => align('left')} disabled={!hasMultiple}><AlignLeftOutlined /></button></Tooltip>
        <Tooltip title="右对齐"><button className="tool-btn" onClick={() => align('right')} disabled={!hasMultiple}><AlignRightOutlined /></button></Tooltip>
        <Tooltip title="上对齐"><button className="tool-btn" onClick={() => align('top')} disabled={!hasMultiple}><VerticalAlignTopOutlined /></button></Tooltip>
        <Tooltip title="下对齐"><button className="tool-btn" onClick={() => align('bottom')} disabled={!hasMultiple}><VerticalAlignBottomOutlined /></button></Tooltip>
        <Tooltip title="水平居中"><button className="tool-btn" onClick={() => align('centerH')} disabled={!hasMultiple}><AlignCenterOutlined /></button></Tooltip>
        <Tooltip title="垂直居中"><button className="tool-btn" onClick={() => align('centerV')} disabled={!hasMultiple}><AlignVIcon /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      {/* 组合 */}
      <div className="tool-group">
        <Tooltip title="组合 Ctrl+G"><button className="tool-btn" onClick={groupSelected} disabled={!hasMultiple}><GroupOutlined /></button></Tooltip>
        <Tooltip title="取消组合"><button className="tool-btn" onClick={ungroupSelected} disabled={!isGroup}><UngroupOutlined /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      {/* 其他 */}
      <div className="tool-group">
        <Tooltip title={showGrid ? '隐藏网格' : '显示网格'}>
          <button className={showGrid ? 'tool-btn active' : 'tool-btn'} onClick={() => toggleGrid()}>
            <AppstoreOutlined />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default TopToolbar;
