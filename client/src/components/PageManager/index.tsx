import { useCallback } from 'react';
import { Tooltip } from 'antd';
import { PlusOutlined, CopyOutlined, CloseOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import './styles.css';

const PageManager: React.FC = () => {
  const { pages, currentPageIndex, addPage, removePage, duplicatePage, setCurrentPage, canvas } =
    useEditorStore();

  /** 切换页面前保存当前页数据 */
  const saveCurrentPage = useCallback(() => {
    if (!canvas) return;
    const json = canvas.toJSON();
    const pageData = {
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      background: (canvas.backgroundColor as string) || '#ffffff',
      objects: (json.objects || []).filter(
        (obj: any) => !(obj as any)._isGrid,
      ) as any[],
    };
    const { pages, currentPageIndex } = useEditorStore.getState();
    const updated = [...pages];
    updated[currentPageIndex] = pageData;
    useEditorStore.setState({ pages: updated });
  }, [canvas]);

  /** 切换页面 */
  const handlePageSwitch = useCallback(
    (index: number) => {
      if (index === currentPageIndex) return;
      saveCurrentPage();
      setCurrentPage(index);
      // 加载目标页数据到画布
      const targetPage = useEditorStore.getState().pages[index];
      if (canvas && targetPage) {
        canvas.clear();
        canvas.setBackgroundColor(targetPage.background || '#ffffff', () => {});
        if (targetPage.objects && targetPage.objects.length > 0) {
          canvas.loadFromJSON({ objects: targetPage.objects }, () => {
            canvas.renderAll();
          });
        } else {
          canvas.renderAll();
        }
      }
    },
    [currentPageIndex, saveCurrentPage, setCurrentPage, canvas],
  );

  /** 删除页面 */
  const handleRemove = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (pages.length <= 1) return;
      removePage(index);
    },
    [pages.length, removePage],
  );

  /** 复制页面 */
  const handleDuplicate = useCallback(
    (index: number) => {
      saveCurrentPage();
      duplicatePage(index);
    },
    [saveCurrentPage, duplicatePage],
  );

  return (
    <div className="page-manager">
      {pages.map((page, index) => (
        <Tooltip
          key={index}
          title={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>第 {index + 1} 页</span>
              <CopyOutlined
                style={{ cursor: 'pointer' }}
                onClick={() => handleDuplicate(index)}
              />
            </div>
          }
          placement="top"
        >
          <div
            className={`page-thumb ${index === currentPageIndex ? 'active' : ''}`}
            onClick={() => handlePageSwitch(index)}
          >
            <div className="page-preview">
              {page.objects?.length ? `${page.objects.length} 个元素` : '空白'}
            </div>
            <span className="page-number">{index + 1}</span>
            {pages.length > 1 && (
              <button className="delete-btn" onClick={(e) => handleRemove(index, e)}>
                <CloseOutlined style={{ fontSize: 8 }} />
              </button>
            )}
          </div>
        </Tooltip>
      ))}
      <button className="page-add-btn" onClick={addPage}>
        <PlusOutlined />
      </button>
    </div>
  );
};

export default PageManager;
