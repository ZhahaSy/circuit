import { useState, useCallback } from 'react';
import type { CircuitData } from '../types';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

interface Props {
  circuitData: CircuitData;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onClose: () => void;
}

type Format = 'pdf' | 'svg' | 'png' | 'json';

export function ExportDialog({ circuitData, svgRef, onClose }: Props) {
  const [format, setFormat] = useState<Format>('pdf');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const svgEl = svgRef.current;
      switch (format) {
        case 'pdf': {
          if (!svgEl) break;
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [1400, 1000] });
          await pdf.svg(svgEl, { x: 0, y: 0, width: 1400, height: 1000 });
          pdf.save(`${circuitData.title}.pdf`);
          break;
        }
        case 'svg': {
          if (!svgEl) break;
          const svgData = new XMLSerializer().serializeToString(svgEl);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          downloadBlob(blob, `${circuitData.title}.svg`);
          break;
        }
        case 'png': {
          if (!svgEl) break;
          const svgData = new XMLSerializer().serializeToString(svgEl);
          const canvas = document.createElement('canvas');
          canvas.width = 2800;
          canvas.height = 2000;
          const ctx = canvas.getContext('2d')!;
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
              if (blob) downloadBlob(blob, `${circuitData.title}.png`);
            });
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
          break;
        }
        case 'json': {
          const blob = new Blob([JSON.stringify(circuitData, null, 2)], { type: 'application/json' });
          downloadBlob(blob, `${circuitData.title}.json`);
          break;
        }
      }
      onClose();
    } finally {
      setExporting(false);
    }
  }, [format, circuitData, svgRef, onClose]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>导出电路图</h3>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {([['pdf', 'PDF', '矢量格式，适合印刷'], ['svg', 'SVG', '可编辑矢量图'], ['png', 'PNG', '位图格式，2x 分辨率'], ['json', 'JSON', '数据格式，可重新导入']] as [Format, string, string][]).map(([key, label, desc]) => (
            <div
              key={key}
              onClick={() => setFormat(key)}
              style={{
                flex: 1, padding: 16, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                border: format === key ? '2px solid #3182ce' : '2px solid #e2e8f0',
                background: format === key ? '#EBF8FF' : '#fff',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: format === key ? '#3182ce' : '#1a202c' }}>{label}</div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={cancelBtn}>取消</button>
          <button onClick={handleExport} disabled={exporting} style={exportBtn}>
            {exporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const dialog: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: 560,
};
const cancelBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#edf2f7', color: '#4a5568', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const exportBtn: React.CSSProperties = {
  padding: '8px 20px', background: '#3182ce', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
