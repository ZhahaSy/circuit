import { useState, useCallback } from 'react';
import type { ComponentType } from '../types';

const CATEGORIES: { label: string; types: ComponentType[] }[] = [
  { label: '电源类', types: ['power', 'ground'] },
  { label: '保护类', types: ['fuse'] },
  { label: '控制类', types: ['relay', 'switch'] },
  { label: '检测/执行', types: ['sensor', 'actuator'] },
  { label: '被动元件', types: ['resistor', 'capacitor'] },
  { label: '半导体', types: ['diode', 'transistor', 'ic'] },
  { label: '连接类', types: ['connector', 'connector_plug', 'splice', 'ecu'] },
];

const TYPE_INFO: Record<string, { label: string; desc: string; symbol: string }> = {
  power: { label: '电源', desc: '常电/点火电源', symbol: '▽' },
  ground: { label: '接地', desc: '电路回路接地点', symbol: '⏚' },
  fuse: { label: '保险丝', desc: '过流保护元件', symbol: '—□—' },
  relay: { label: '继电器', desc: '电路开关控制', symbol: '⊡' },
  switch: { label: '开关', desc: '手动控制通断', symbol: '/' },
  sensor: { label: '传感器', desc: '采集信号输入', symbol: '◇' },
  actuator: { label: '执行器', desc: '执行控制输出', symbol: '⊞' },
  resistor: { label: '电阻', desc: '限流、分压', symbol: '⏛' },
  capacitor: { label: '电容', desc: '滤波、储能', symbol: '⊥⊤' },
  diode: { label: '二极管', desc: '单向导通', symbol: '▷|' },
  transistor: { label: '三极管', desc: '放大、开关', symbol: '⊳' },
  ic: { label: '集成电路', desc: '复杂功能处理', symbol: '⊡⊡' },
  connector: { label: '连接器', desc: '线束对接', symbol: '⊟' },
  connector_plug: { label: '对接插头', desc: '多线束对接', symbol: '⊞⊟' },
  splice: { label: '连接点', desc: '线束合并节点', symbol: '●' },
  ecu: { label: 'ECU', desc: '控制模块接口', symbol: '▣' },
};

interface CustomSvgEntry {
  id: string;
  name: string;
  dataUrl: string;
}

interface Props {
  customSvgs: CustomSvgEntry[];
  onUploadSvg: (name: string, dataUrl: string) => void;
  onDeleteSvg: (id: string) => void;
}

export function ComponentLibrary({ customSvgs, onUploadSvg, onDeleteSvg }: Props) {
  const [selectedCategory, setSelectedCategory] = useState(0);

  const handleUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const name = file.name.replace('.svg', '');
        onUploadSvg(name, reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [onUploadSvg]);

  const currentTypes = CATEGORIES[selectedCategory].types;

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f7fafc' }}>
      {/* 分类侧边栏 */}
      <div style={{ width: 200, borderRight: '1px solid #e2e8f0', background: '#fff', padding: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>元器件分类</div>
        {CATEGORIES.map((cat, i) => (
          <div
            key={i}
            onClick={() => setSelectedCategory(i)}
            style={{
              padding: '8px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
              background: i === selectedCategory ? '#EBF8FF' : 'transparent',
              color: i === selectedCategory ? '#3182ce' : '#4a5568',
              fontWeight: i === selectedCategory ? 600 : 400, fontSize: 13,
            }}
          >
            {cat.label}
            <span style={{ float: 'right', color: '#a0aec0', fontSize: 11 }}>{cat.types.length}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 12 }}>
          <div
            onClick={() => setSelectedCategory(-1)}
            style={{
              padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
              background: selectedCategory === -1 ? '#EBF8FF' : 'transparent',
              color: selectedCategory === -1 ? '#3182ce' : '#4a5568',
              fontWeight: selectedCategory === -1 ? 600 : 400, fontSize: 13,
            }}
          >
            自定义 SVG
            <span style={{ float: 'right', color: '#a0aec0', fontSize: 11 }}>{customSvgs.length}</span>
          </div>
        </div>
      </div>

      {/* 卡片网格 */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>
            {selectedCategory === -1 ? '自定义 SVG 元器件' : CATEGORIES[selectedCategory].label}
          </h3>
          {selectedCategory === -1 && (
            <button onClick={handleUpload} style={uploadBtn}>上传 SVG</button>
          )}
        </div>

        {selectedCategory >= 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {currentTypes.map(type => {
              const info = TYPE_INFO[type];
              return (
                <div key={type} style={cardStyle}>
                  <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8, color: '#3182ce' }}>{info.symbol}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, textAlign: 'center' }}>{info.label}</div>
                  <div style={{ fontSize: 11, color: '#718096', textAlign: 'center', marginTop: 4 }}>{info.desc}</div>
                  <div style={{ fontSize: 10, color: '#a0aec0', textAlign: 'center', marginTop: 8, fontFamily: 'monospace' }}>{type}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {customSvgs.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#a0aec0' }}>
                暂无自定义 SVG，点击"上传 SVG"添加
              </div>
            )}
            {customSvgs.map(svg => (
              <div key={svg.id} style={cardStyle}>
                <img src={svg.dataUrl} alt={svg.name} style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{svg.name}</div>
                <button
                  onClick={() => onDeleteSvg(svg.id)}
                  style={{ marginTop: 8, padding: '2px 8px', background: 'transparent', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: 4, cursor: 'pointer', fontSize: 11, display: 'block', margin: '8px auto 0' }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0',
  transition: 'box-shadow 0.15s',
};
const uploadBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#3182ce', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
