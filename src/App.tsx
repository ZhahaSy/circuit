import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { sampleCircuit } from './sampleData';
import type { CircuitData, StyleConfig, ComponentType, LayerConfig, NodeStyleConfig, WireStyleConfig } from './types';
import { defaultStyleConfig } from './styles/defaultStyles';
import { usePositions } from './hooks/usePositions';
import { useNodeDrag } from './hooks/useNodeDrag';
import { useTemplateStore } from './hooks/useTemplateStore';
import { CircuitSvg } from './components/CircuitSvg';
import { TemplateEditor } from './components/TemplateEditor';
import { ImportDialog } from './components/ImportDialog';
import { ExportDialog } from './components/ExportDialog';
import { ComponentLibrary } from './components/ComponentLibrary';
import { autoLayers } from './layout/autoLayers';

const ALL_TYPES: ComponentType[] = ['power', 'fuse', 'relay', 'switch', 'splice', 'connector', 'connector_plug', 'ecu', 'ground'];
const TYPE_LABELS: Record<ComponentType, string> = {
  power: '电源', fuse: '保险丝', relay: '继电器', switch: '开关',
  splice: '接头', connector: '连接器', connector_plug: '对接插头', ecu: 'ECU', ground: '接地',
  sensor: '传感器', actuator: '执行器', resistor: '电阻', capacitor: '电容',
  diode: '二极管', transistor: '三极管', ic: '集成电路',
};

type AppTab = 'preview' | 'config' | 'template' | 'library';

interface CustomSvgEntry { id: string; name: string; dataUrl: string; }

function App() {
  const [appTab, setAppTab] = useState<AppTab>('preview');
  const [circuitData, setCircuitData] = useState<CircuitData>(sampleCircuit);
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(defaultStyleConfig);
  const templateStore = useTemplateStore();
  const { activeTemplate } = templateStore;

  // Derive layers: auto mode computes from data, template mode uses template
  const isAutoLayer = activeTemplate.layoutRules.layerMode === 'auto';
  const autoComputedLayers = useMemo(
    () => isAutoLayer ? autoLayers(circuitData) : [],
    // Only recompute when nodes change, not on every circuitData reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAutoLayer, circuitData.nodes],
  );
  const [manualLayers, setManualLayers] = useState<LayerConfig[]>(
    activeTemplate.layoutRules.layerTemplate,
  );
  const layers = isAutoLayer ? autoComputedLayers : manualLayers;
  const setLayers = setManualLayers;
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(sampleCircuit, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [customSvgs, setCustomSvgs] = useState<CustomSvgEntry[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { positions, powerBuses, busBarTopY, updatePosition, resetPositions } = usePositions(
    circuitData, layers, activeTemplate.layoutRules,
  );

  useEffect(() => {
    setCircuitData(prev => {
      if (prev.layers === layers) return prev;
      return { ...prev, layers };
    });
    resetPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // Reset manual layers when template changes (id or layer content)
  const templateLayerJson = JSON.stringify(activeTemplate.layoutRules.layerTemplate);
  useEffect(() => {
    if (!isAutoLayer) {
      setManualLayers(activeTemplate.layoutRules.layerTemplate);
    }
  }, [activeTemplate.id, templateLayerJson, isAutoLayer]);

  const { onPointerDown, onPointerMove, onPointerUp } = useNodeDrag({
    svgRef,
    onDrag: updatePosition,
  });

  // --- 样式编辑 ---
  const updateNodeTypeStyle = useCallback((type: ComponentType, key: keyof NodeStyleConfig, value: string | number) => {
    setStyleConfig(prev => ({
      ...prev,
      nodeByType: { ...prev.nodeByType, [type]: { ...prev.nodeByType?.[type], [key]: value } },
    }));
  }, []);

  const updateWireStyle = useCallback((wireId: string, key: keyof WireStyleConfig, value: string | number) => {
    setStyleConfig(prev => ({
      ...prev,
      wireById: { ...prev.wireById, [wireId]: { ...prev.wireById?.[wireId], [key]: value } },
    }));
  }, []);

  const handleSvgUpload = useCallback((nodeId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCircuitData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, customSvg: reader.result as string } : n),
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImport = useCallback((data: CircuitData) => {
    setCircuitData(data);
    setJsonText(JSON.stringify(data, null, 2));
    if (data.layers) setLayers(data.layers);
    setShowImport(false);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 顶部导航栏 */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#3182ce', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>⚡</div>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>汽车电路图生成器</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {([['preview', '预览'], ['config', '配置'], ['template', '规则模板'], ['library', '元器件库']] as [AppTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAppTab(key)}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                background: appTab === key ? '#3182ce' : 'transparent',
                color: appTab === key ? '#fff' : '#4a5568',
                fontWeight: appTab === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={topBtnGray}>导入数据</button>
          <button onClick={() => setShowExport(true)} style={topBtnAccent}>导出</button>
        </div>
      </header>

      {/* 主内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {appTab === 'preview' && (
          <div style={{ display: 'flex', height: '100%' }}>
            {/* SVG 画布 */}
            <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
              <CircuitSvg
                ref={svgRef}
                data={circuitData}
                positions={positions}
                styleConfig={styleConfig}
                layers={layers}
                wireRules={activeTemplate.wireRules}
                pinRules={activeTemplate.pinRules}
                powerBuses={powerBuses}
                busBarTopY={busBarTopY}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onLayerReorder={setLayers}
              />
            </div>

            {/* 右侧面板 */}
            <div style={{ width: 300, borderLeft: '1px solid #e2e8f0', background: '#fff', overflow: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => { setShowStylePanel(!showStylePanel); setShowLayerPanel(false); }} style={showStylePanel ? panelBtnActive : panelBtn}>样式</button>
                <button onClick={() => { setShowLayerPanel(!showLayerPanel); setShowStylePanel(false); }} style={showLayerPanel ? panelBtnActive : panelBtn}>层级</button>
              </div>

              {showStylePanel && (
                <div>
                  <h4 style={sectionTitle}>节点样式</h4>
                  {ALL_TYPES.map(type => (
                    <div key={type} style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>
                        <span style={{ fontSize: 12 }}>{TYPE_LABELS[type]}</span>
                        <input type="color" value={styleConfig.nodeByType?.[type]?.fill || '#eee'} onChange={e => updateNodeTypeStyle(type, 'fill', e.target.value)} />
                        <input type="color" value={styleConfig.nodeByType?.[type]?.stroke || '#999'} onChange={e => updateNodeTypeStyle(type, 'stroke', e.target.value)} />
                      </label>
                    </div>
                  ))}
                  <h4 style={sectionTitle}>线束样式</h4>
                  {circuitData.wires.slice(0, 10).map(w => (
                    <div key={w.id} style={{ marginBottom: 4 }}>
                      <label style={labelStyle}>
                        <span style={{ fontSize: 11 }}>{w.id} ({w.color})</span>
                        <input type="range" min={1} max={8} value={styleConfig.wireById?.[w.id]?.strokeWidth ?? 4} onChange={e => updateWireStyle(w.id, 'strokeWidth', +e.target.value)} style={{ width: 60 }} />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {showLayerPanel && (
                <div>
                  <h4 style={sectionTitle}>层级顺序</h4>
                  {isAutoLayer ? (
                    <div>
                      <div style={{ padding: 10, background: '#F0FFF4', borderRadius: 6, border: '1px solid #C6F6D5', marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#276749', fontWeight: 500 }}>自动分层模式</div>
                        <div style={{ fontSize: 10, color: '#48BB78', marginTop: 2 }}>层级根据电路拓扑自动计算，无需手动配置</div>
                      </div>
                      {layers.map((layer, i) => (
                        <div key={layer.id} style={{ marginBottom: 4, padding: '6px 8px', background: '#f7fafc', borderRadius: 4 }}>
                          <span style={{ fontSize: 11, color: '#718096' }}>{i + 1}. {layer.label}</span>
                          <span style={{ fontSize: 9, color: '#a0aec0', marginLeft: 6 }}>
                            ({layer.types.map(t => TYPE_LABELS[t] || t).join(', ')})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 11, color: '#718096', marginBottom: 8 }}>拖拽 SVG 中的层级标签可调整顺序</p>
                  {layers.map((layer, i) => (
                    <div key={layer.id} style={{ marginBottom: 8, padding: '8px', background: '#f7fafc', borderRadius: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <input
                          value={layer.label}
                          onChange={e => setLayers(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))}
                          style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', width: 80 }}
                        />
                        <span
                          style={{ color: '#e53e3e', cursor: 'pointer', fontSize: 10, marginLeft: 'auto' }}
                          onClick={() => setLayers(prev => prev.filter((_, j) => j !== i))}
                        >
                          删除
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {ALL_TYPES.map(t => {
                          const active = layer.types.includes(t);
                          return (
                            <span
                              key={t}
                              onClick={() => {
                                setLayers(prev => prev.map((l, j) => {
                                  if (j !== i) return l;
                                  const types = active ? l.types.filter(x => x !== t) : [...l.types, t];
                                  return { ...l, types };
                                }));
                              }}
                              style={{
                                padding: '1px 6px', borderRadius: 8, fontSize: 9, cursor: 'pointer',
                                background: active ? '#DBEAFE' : '#fff',
                                color: active ? '#3182ce' : '#a0aec0',
                                border: active ? '1px solid #93C5FD' : '1px solid #e2e8f0',
                              }}
                            >
                              {TYPE_LABELS[t]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button onClick={() => setLayers(prev => [...prev, { id: `layer_${Date.now()}`, label: '新层级', types: [] }])} style={smallBtnStyle}>+ 添加层级</button>
                    <button onClick={() => setLayers(prev => prev.slice(0, -1))} style={smallBtnStyle}>- 删除末尾</button>
                  </div>
                    </div>
                  )}
                </div>
              )}

              {!showStylePanel && !showLayerPanel && (
                <div>
                  <h4 style={sectionTitle}>当前模板</h4>
                  <div style={{ padding: 12, background: '#EBF8FF', borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#3182ce' }}>{activeTemplate.name}</div>
                    {activeTemplate.description && <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>{activeTemplate.description}</div>}
                  </div>
                  <h4 style={sectionTitle}>节点信息</h4>
                  <div style={{ fontSize: 12, color: '#4a5568' }}>
                    {circuitData.nodes.length} 个节点 · {circuitData.wires.length} 条线束
                    {circuitData.fuseBoxes && ` · ${circuitData.fuseBoxes.length} 个电器盒`}
                  </div>
                  {circuitData.nodes.map(n => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11 }}>
                      <span style={{ color: '#718096', width: 50 }}>{n.id}</span>
                      <span>{n.label}</span>
                      {n.customSvg ? <span style={{ color: '#38a169', fontSize: 10 }}>✓SVG</span> : (
                        <label style={{ cursor: 'pointer', color: '#3182ce', fontSize: 10 }}>
                          上传
                          <input type="file" accept=".svg" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleSvgUpload(n.id, e.target.files[0]); }} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {appTab === 'config' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
              <button onClick={() => {
                try {
                  const parsed = JSON.parse(jsonText);
                  setCircuitData(parsed);
                  if (parsed.layers) setLayers(parsed.layers);
                  setJsonError(null);
                } catch (e) { setJsonError((e as Error).message); }
              }} style={btnStyle}>应用 JSON</button>
              <button onClick={() => setJsonText(JSON.stringify(circuitData, null, 2))} style={smallBtnStyle}>刷新</button>
              {jsonError && <span style={{ color: '#e53e3e', fontSize: 12, alignSelf: 'center' }}>{jsonError}</span>}
            </div>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, padding: 16, border: 'none', outline: 'none', resize: 'none' }}
            />
          </div>
        )}

        {appTab === 'template' && (
          <TemplateEditor
            allTemplates={templateStore.allTemplates}
            activeId={templateStore.activeId}
            onSetActive={templateStore.setActive}
            onCreate={templateStore.createTemplate}
            onUpdate={templateStore.updateTemplate}
            onDelete={templateStore.deleteTemplate}
            onDuplicate={templateStore.duplicateTemplate as (id: string) => void}
            onExport={templateStore.exportTemplate}
            onImport={templateStore.importTemplate}
          />
        )}

        {appTab === 'library' && (
          <ComponentLibrary
            customSvgs={customSvgs}
            onUploadSvg={(name, dataUrl) => setCustomSvgs(prev => [...prev, { id: `svg_${Date.now()}`, name, dataUrl }])}
            onDeleteSvg={(id) => setCustomSvgs(prev => prev.filter(s => s.id !== id))}
          />
        )}
      </div>

      {/* 弹窗 */}
      {showImport && <ImportDialog onImport={handleImport} onClose={() => setShowImport(false)} />}
      {showExport && <ExportDialog circuitData={circuitData} svgRef={svgRef} onClose={() => setShowExport(false)} />}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 24px', height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0',
};
const topBtnGray: React.CSSProperties = {
  padding: '8px 14px', background: '#edf2f7', color: '#4a5568', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const topBtnAccent: React.CSSProperties = {
  padding: '8px 14px', background: '#3182ce', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const btnStyle: React.CSSProperties = {
  padding: '8px 20px', background: '#3182ce', color: 'white', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 14,
};
const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: 'transparent', border: '1px solid #ccc',
  borderRadius: 4, cursor: 'pointer', fontSize: 12,
};
const panelBtn: React.CSSProperties = {
  padding: '6px 14px', background: '#edf2f7', color: '#4a5568', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 12,
};
const panelBtnActive: React.CSSProperties = {
  ...panelBtn, background: '#3182ce', color: '#fff',
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, margin: '12px 0 8px', color: '#2d3748',
};
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
};

export default App;
