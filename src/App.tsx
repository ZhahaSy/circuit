import { useRef, useState, useCallback, useEffect } from 'react';
import { sampleCircuit } from './sampleData';
import type { CircuitData, StyleConfig, ComponentType, LayerConfig, NodeStyleConfig, WireStyleConfig } from './types';
import { defaultStyleConfig } from './styles/defaultStyles';
import { DEFAULT_LAYERS } from './layout/defaultLayers';
import { usePositions } from './hooks/usePositions';
import { useNodeDrag } from './hooks/useNodeDrag';
import { CircuitSvg } from './components/CircuitSvg';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

const ALL_TYPES: ComponentType[] = ['power', 'fuse', 'relay', 'switch', 'splice', 'connector', 'connector_plug', 'ecu', 'ground'];
const TYPE_LABELS: Record<ComponentType, string> = {
  power: '电源', fuse: '保险丝', relay: '继电器', switch: '开关',
  splice: '接头', connector: '连接器', connector_plug: '对接插头', ecu: 'ECU', ground: '接地',
};

function App() {
  const [circuitData, setCircuitData] = useState<CircuitData>(sampleCircuit);
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(defaultStyleConfig);
  const [layers, setLayers] = useState<LayerConfig[]>(() => circuitData.layers ?? DEFAULT_LAYERS);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const { positions, updatePosition, resetPositions } = usePositions(circuitData, layers);

  // Sync layers into circuitData and reset positions when layers change
  useEffect(() => {
    setCircuitData(prev => ({ ...prev, layers }));
    resetPositions();
  }, [layers, resetPositions]);
  const { onPointerDown, onPointerMove, onPointerUp } = useNodeDrag({
    svgRef,
    onDrag: updatePosition,
  });

  const exportPDF = async () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [1400, 1000],
    });
    await pdf.svg(svgEl, { x: 0, y: 0, width: 1400, height: 1000 });
    pdf.save(`${circuitData.title}.pdf`);
  };

  // --- 样式编辑 ---
  const updateNodeTypeStyle = useCallback((type: ComponentType, key: keyof NodeStyleConfig, value: string | number) => {
    setStyleConfig(prev => ({
      ...prev,
      nodeByType: {
        ...prev.nodeByType,
        [type]: {
          ...prev.nodeByType?.[type],
          [key]: value,
        },
      },
    }));
  }, []);

  const updateWireStyle = useCallback((wireId: string, key: keyof WireStyleConfig, value: string | number) => {
    setStyleConfig(prev => ({
      ...prev,
      wireById: {
        ...prev.wireById,
        [wireId]: {
          ...prev.wireById?.[wireId],
          [key]: value,
        },
      },
    }));
  }, []);

  const handleSvgUpload = useCallback((nodeId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCircuitData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, customSvg: dataUrl } : n),
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  // --- 分层编辑 ---
  const addLayer = useCallback(() => {
    setLayers(prev => [...prev, { id: `layer_${Date.now()}`, label: '新层', types: [] }]);
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
  }, []);

  const moveLayer = useCallback((id: string, dir: -1 | 1) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const updateLayerLabel = useCallback((id: string, label: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, label } : l));
  }, []);

  const toggleLayerType = useCallback((layerId: string, type: ComponentType) => {
    setLayers(prev => prev.map(l => {
      if (l.id !== layerId) {
        // Remove type from other layers
        return l.types.includes(type) ? { ...l, types: l.types.filter(t => t !== type) } : l;
      }
      // Toggle on target layer
      return l.types.includes(type)
        ? { ...l, types: l.types.filter(t => t !== type) }
        : { ...l, types: [...l.types, type] };
    }));
  }, []);

  // Find unassigned types
  const assignedTypes = new Set(layers.flatMap(l => l.types));
  const unassignedTypes = ALL_TYPES.filter(t => !assignedTypes.has(t));

  return (
    <div style={{ padding: 20, background: '#f7fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: '#1a202c' }}>汽车电路图生成器</h1>
        <button onClick={exportPDF} style={btnStyle}>导出 PDF</button>
        <button onClick={resetPositions} style={{ ...btnStyle, background: '#718096' }}>重置布局</button>
        <button onClick={() => setShowStylePanel(p => !p)} style={{ ...btnStyle, background: '#805ad5' }}>
          {showStylePanel ? '隐藏样式' : '样式编辑'}
        </button>
        <button onClick={() => setShowLayerPanel(p => !p)} style={{ ...btnStyle, background: '#d69e2e' }}>
          {showLayerPanel ? '隐藏分层' : '分层设置'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            flex: 1,
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            overflow: 'auto',
            padding: 16,
          }}
        >
          <CircuitSvg
            ref={svgRef}
            data={circuitData}
            positions={positions}
            styleConfig={styleConfig}
            layers={layers}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onLayerReorder={setLayers}
          />
        </div>

        {showStylePanel && (
          <div style={{ width: 280, background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 16, overflow: 'auto', maxHeight: '80vh', fontSize: 12 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>节点样式</h3>
            {ALL_TYPES.map(type => {
              const s = styleConfig.nodeByType?.[type];
              return (
                <div key={type} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{type}</div>
                  <label style={labelStyle}>
                    fill
                    <input type="color" value={s?.fill || '#eeeeee'} onChange={e => updateNodeTypeStyle(type, 'fill', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    stroke
                    <input type="color" value={s?.stroke || '#999999'} onChange={e => updateNodeTypeStyle(type, 'stroke', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    strokeWidth
                    <input type="number" min={0.5} max={6} step={0.5} value={s?.strokeWidth ?? 2} onChange={e => updateNodeTypeStyle(type, 'strokeWidth', +e.target.value)} style={{ width: 50 }} />
                  </label>
                </div>
              );
            })}

            <h3 style={{ margin: '12px 0 8px', fontSize: 14 }}>线路样式</h3>
            {circuitData.wires.map(w => {
              const ws = styleConfig.wireById?.[w.id];
              return (
                <div key={w.id} style={{ marginBottom: 6 }}>
                  <label style={labelStyle}>
                    {w.id} ({w.color})
                    <input type="color" value={ws?.color || '#333333'} onChange={e => updateWireStyle(w.id, 'color', e.target.value)} />
                    <input type="range" min={0} max={1} step={0.1} value={ws?.opacity ?? 1} onChange={e => updateWireStyle(w.id, 'opacity', +e.target.value)} style={{ width: 60 }} />
                  </label>
                </div>
              );
            })}
            <h3 style={{ margin: '12px 0 8px', fontSize: 14 }}>自定义 SVG</h3>
            {circuitData.nodes.map(n => (
              <div key={n.id} style={{ marginBottom: 4 }}>
                <label style={labelStyle}>
                  {n.id} ({n.label})
                  <input
                    type="file"
                    accept=".svg"
                    style={{ width: 120, fontSize: 10 }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleSvgUpload(n.id, f);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {showLayerPanel && (
          <div style={{ width: 300, background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 16, overflow: 'auto', maxHeight: '80vh', fontSize: 12 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>分层设置</h3>
            {unassignedTypes.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 4, padding: 8, marginBottom: 12, color: '#744210' }}>
                未分配类型: {unassignedTypes.map(t => TYPE_LABELS[t]).join(', ')}
              </div>
            )}
            {layers.map((layer, idx) => (
              <div key={layer.id} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <input
                    value={layer.label}
                    onChange={e => updateLayerLabel(layer.id, e.target.value)}
                    style={{ flex: 1, padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                  />
                  <button onClick={() => moveLayer(layer.id, -1)} disabled={idx === 0} style={smallBtnStyle}>↑</button>
                  <button onClick={() => moveLayer(layer.id, 1)} disabled={idx === layers.length - 1} style={smallBtnStyle}>↓</button>
                  <button onClick={() => deleteLayer(layer.id)} style={{ ...smallBtnStyle, color: '#e53e3e' }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ALL_TYPES.map(type => {
                    const checked = layer.types.includes(type);
                    const ownedElsewhere = !checked && assignedTypes.has(type);
                    return (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: ownedElsewhere ? 0.4 : 1 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLayerType(layer.id, type)}
                        />
                        <span style={{ fontSize: 11 }}>{TYPE_LABELS[type]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={addLayer} style={{ ...btnStyle, width: '100%', background: '#38a169', fontSize: 12, padding: '6px 12px' }}>
              + 添加层
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: 16, background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#4a5568' }}>回路表数据 (JSON)</h3>
        <pre style={{ fontSize: 11, color: '#2d3748', overflow: 'auto', maxHeight: 300, margin: 0 }}>
          {JSON.stringify(circuitData, null, 2)}
        </pre>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: '#3182ce',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '2px 6px',
  background: 'transparent',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 2,
};

export default App;
