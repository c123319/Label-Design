import { useCallback, useState } from 'react';
import { Dropdown, MenuProps } from 'antd';
import {
  CopyOutlined,
  ScissorOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  ToTopOutlined,
  VerticalAlignBottomOutlined,
  GroupOutlined,
  UngroupOutlined,
} from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';

const ContextMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locked, setLocked] = useState(false);
  const {
    canvas,
    activeObject,
    copySelected,
    pasteObject,
    deleteSelected,
    groupSelected,
    ungroupSelected,
  } = useEditorStore();

  const handleLock = useCallback(() => {
    if (!canvas || !activeObject) return;
    activeObject.set({ selectable: locked, evented: locked, lockMovementX: !locked, lockMovementY: !locked });
    canvas.renderAll();
    setLocked(!locked);
  }, [canvas, activeObject, locked]);

  const bringToFront = useCallback(() => {
    if (!canvas || !activeObject) return;
    canvas.bringToFront(activeObject);
    canvas.renderAll();
  }, [canvas, activeObject]);

  const sendToBack = useCallback(() => {
    if (!canvas || !activeObject) return;
    canvas.sendToBack(activeObject);
    canvas.renderAll();
  }, [canvas, activeObject]);

  const items: MenuProps['items'] = [
    { key: 'copy', label: '复制 Ctrl+C', icon: <CopyOutlined />, onClick: copySelected },
    { key: 'paste', label: '粘贴 Ctrl+V', icon: <ScissorOutlined />, onClick: pasteObject },
    { type: 'divider' },
    { key: 'delete', label: '删除 Delete', icon: <DeleteOutlined />, danger: true, onClick: deleteSelected },
    { type: 'divider' },
    { key: 'front', label: '置顶', icon: <ToTopOutlined />, onClick: bringToFront },
    { key: 'back', label: '置底', icon: <VerticalAlignBottomOutlined />, onClick: sendToBack },
    { type: 'divider' },
    { key: 'group', label: '组合 Ctrl+G', icon: <GroupOutlined />, onClick: groupSelected },
    { key: 'ungroup', label: '取消组合', icon: <UngroupOutlined />, onClick: ungroupSelected },
    { type: 'divider' },
    {
      key: 'lock',
      label: locked ? '解锁' : '锁定',
      icon: locked ? <UnlockOutlined /> : <LockOutlined />,
      onClick: handleLock,
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['contextMenu']}>
      {children}
    </Dropdown>
  );
};

export default ContextMenu;
