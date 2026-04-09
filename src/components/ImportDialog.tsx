import { useCallback, useRef, useState } from 'react';
import type { CircuitData } from '../types';
import { sampleCircuit } from '../sampleData';

interface Props {
  onImport: (data: CircuitData) => void;
  onClose: () => void;
}

export function ImportDialog({ onImport, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as CircuitData;
        if (!data.nodes || !data.wires) throw new Error('缺少 nodes 或 wires 字段');
        onImport(data);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    reader.readAsText(file);
  }, [onImport]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>导入电路数据</h3>

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={dropZone}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 13, color: '#4a5568' }}>拖拽 JSON 文件到此处，或点击选择</div>
          <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>支持 .json 格式的电路回路表</div>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }} />
        </div>

        {error && <div style={{ color: '#e53e3e', fontSize: 12, marginTop: 8 }}>错误：{error}</div>}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>或加载示例数据：</div>
          <button onClick={() => onImport(sampleCircuit)} style={sampleBtn}>
            前照灯系统电路图（示例）
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>关闭</button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const dialog: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflow: 'auto',
};
const dropZone: React.CSSProperties = {
  border: '2px dashed #cbd5e0', borderRadius: 8, padding: 32, textAlign: 'center', cursor: 'pointer',
};
const sampleBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#EBF8FF', color: '#3182ce', border: '1px solid #BEE3F8',
  borderRadius: 6, cursor: 'pointer', fontSize: 12,
};
const cancelBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#edf2f7', color: '#4a5568', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
