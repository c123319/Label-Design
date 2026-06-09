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
  SelectOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

const TopToolbar: React.FC = () => {
  const {
    activeObject, activeObjects, undo, redo,
    copySelected, pasteObject, deleteSelected,
    groupSelected, ungroupSelected, showGrid, toggleGrid,
    canvasTool, setCanvasTool,
  } = useEditorStore();

  const hasSelection = !!activeObject;
  const hasMultiple = activeObjects.length > 1;
  const isGroup = activeObject?.type === 'group';

  return (
    <div className="top-toolbar">
      {/* 撤销重做 */}
      <div className="tool-group">
        <Tooltip title="撤销 Ctrl+Z"><button className="tool-btn" onClick={undo}><UndoOutlined /></button></Tooltip>
        <Tooltip title="重做 Ctrl+Y"><button className="tool-btn" onClick={redo}><RedoOutlined /></button></Tooltip>
      </div>

      <div className="tool-sep" />

      {/* 选中 / 拖拽工具 */}
      <div className="tool-group">
        <Tooltip title="选中工具 (V)">
          <button
            className={canvasTool === 'select' ? 'tool-btn active' : 'tool-btn'}
            onClick={() => setCanvasTool('select')}
          >
            <SelectOutlined />
          </button>
        </Tooltip>
        <Tooltip title="拖拽工具 (H)">
          <button
            className={canvasTool === 'pan' ? 'tool-btn active' : 'tool-btn'}
            onClick={() => setCanvasTool('pan')}
          >
            <DragOutlined />
          </button>
        </Tooltip>
      </div>

      <div className="tool-sep" />

      {/* 编辑操作 */}
      <div className="tool-group">
        <Tooltip title="复制 Ctrl+C"><button className="tool-btn" onClick={copySelected} disabled={!hasSelection}><CopyOutlined /></button></Tooltip>
        <Tooltip title="粘贴 Ctrl+V"><button className="tool-btn" onClick={pasteObject}><SnippetsOutlined /></button></Tooltip>
        <Tooltip title="删除 Delete"><button className="tool-btn danger" onClick={deleteSelected} disabled={!hasSelection}><DeleteOutlined /></button></Tooltip>
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
