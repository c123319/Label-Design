import { useState, useCallback, useRef, useEffect } from 'react';
import { ZoomInOutlined, ZoomOutOutlined, ExpandOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/useEditorStore';
import { fitCanvasToContainer } from '@/utils/canvasViewport';
import './styles.css';

const ZoomBar: React.FC = () => {
  const { zoom, setZoom, canvas, templateSize } = useEditorStore();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleZoomIn = useCallback(() => setZoom(Math.min(zoom + 0.1, 5)), [zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(Math.max(zoom - 0.1, 0.1)), [zoom, setZoom]);

  const handleFit = useCallback(() => {
    if (!canvas) return;
    fitCanvasToContainer(canvas, templateSize);
    setZoom(canvas.getZoom());
  }, [canvas, templateSize, setZoom]);

  const handleEditSubmit = useCallback(() => {
    const val = parseInt(inputVal, 10);
    if (!isNaN(val) && val >= 10 && val <= 500) {
      setZoom(val / 100);
    }
    setEditing(false);
  }, [inputVal, setZoom]);

  const startEdit = useCallback(() => {
    setInputVal(String(Math.round(zoom * 100)));
    setEditing(true);
  }, [zoom]);

  return (
    <div className="zoom-bar">
      <button className="zoom-btn" onClick={handleZoomOut} title="缩小">
        <ZoomOutOutlined />
      </button>
      {editing ? (
        <input
          ref={inputRef}
          className="zoom-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value.replace(/\D/g, ''))}
          onBlur={handleEditSubmit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit(); if (e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <span className="zoom-value" onClick={startEdit}>{Math.round(zoom * 100)}%</span>
      )}
      <button className="zoom-btn" onClick={handleZoomIn} title="放大">
        <ZoomInOutlined />
      </button>
      <button className="zoom-btn" onClick={handleFit} title="适应画布">
        <ExpandOutlined />
      </button>
    </div>
  );
};

export default ZoomBar;
