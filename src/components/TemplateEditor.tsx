import { useState, useCallback } from 'react';
import type {
  RuleTemplate,
  ConnectionRuleConfig,
  WireRuleConfig,
  LayoutRuleConfig,
  PinRuleConfig,
  ComponentType,
} from '../types';

const ALL_TYPES: ComponentType[] = [
  'power', 'fuse', 'relay', 'switch', 'splice', 'connector',
  'connector_plug', 'ecu', 'ground', 'sensor', 'actuator',
  'resistor', 'capacitor', 'diode', 'transistor', 'ic',
];

const TYPE_LABELS: Record<string, string> = {
  power: '电源', fuse: '保险丝', relay: '继电器', switch: '开关',
  splice: '接头', connector: '连接器', connector_plug: '对接插头',
  ecu: 'ECU', ground: '接地', sensor: '传感器', actuator: '执行器',
  resistor: '电阻', capacitor: '电容', diode: '二极管',
  transistor: '三极管', ic: '集成电路',
};

type TabKey = 'connection' | 'wire' | 'layout' | 'pin';

interface Props {
  allTemplates: RuleTemplate[];
  activeId: string;
  onSetActive: (id: string) => void;
  onCreate: (base: RuleTemplate, name: string) => string;
  onUpdate: (id: string, patch: Partial<RuleTemplate>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onImport: (json: string) => string;
}

export function TemplateEditor({
  allTemplates, activeId, onSetActive, onCreate, onUpdate, onDelete, onDuplicate, onExport, onImport,
}: Props) {
  const [selectedId, setSelectedId] = useState(activeId);
  const [tab, setTab] = useState<TabKey>('connection');
  const [search, setSearch] = useState('');

  const selected = allTemplates.find(t => t.id === selectedId) || allTemplates[0];
  const filtered = allTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const updateRules = useCallback(<K extends keyof RuleTemplate>(key: K, value: RuleTemplate[K]) => {
    if (selected.isBuiltin) return;
    onUpdate(selected.id, { [key]: value });
  }, [selected, onUpdate]);

  const handleImportFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const id = onImport(reader.result as string);
        setSelectedId(id);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onImport]);

  const handleCreate = useCallback(() => {
    const name = prompt('输入模板名称：');
    if (!name) return;
    const id = onCreate(selected, name);
    setSelectedId(id);
  }, [selected, onCreate]);

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f7fafc' }}>
      {/* 左侧模板列表 */}
      <div style={{ width: 280, borderRight: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', padding: 16, gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: 14 }}>模板列表</span>
          <button onClick={handleCreate} style={accentBtnSm}>+ 新建</button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索模板..."
          style={searchInput}
        />
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                padding: 12, borderRadius: 8, cursor: 'pointer',
                background: t.id === selectedId ? '#EFF6FF' : '#f7fafc',
                border: t.id === selectedId ? '1px solid #3182ce' : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: t.id === selectedId ? '#3182ce' : '#1a202c' }}>{t.name}</span>
                {t.id === activeId && <span style={{ padding: '2px 8px', background: '#C6F6D5', color: '#276749', borderRadius: 10, fontSize: 10 }}>使用中</span>}
              </div>
              {t.description && <div style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>{t.description}</div>}
              <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 4 }}>
                {t.isBuiltin ? '内置 · 不可删除' : `${t.manufacturer || '自定义'} · ${t.updatedAt.slice(0, 10)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧编辑区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tab 栏 */}
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          {([['connection', '连接规则'], ['wire', '线束规则'], ['layout', '布局规则'], ['pin', '针脚规则']] as [TabKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: tab === key ? '#3182ce' : '#718096', fontWeight: tab === key ? 600 : 400,
                borderBottom: tab === key ? '2px solid #3182ce' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 表单内容 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              {tab === 'connection' && '元器件连接规则配置'}
              {tab === 'wire' && '线束生成规则配置'}
              {tab === 'layout' && '布局规则配置'}
              {tab === 'pin' && '针脚展示规则配置'}
            </h3>
            <span style={{ padding: '4px 10px', background: '#DBEAFE', borderRadius: 4, fontSize: 11, color: '#3182ce' }}>
              {selected.name}
            </span>
          </div>

          {tab === 'connection' && <ConnectionTab rules={selected.connectionRules} onChange={r => updateRules('connectionRules', r)} readonly={selected.isBuiltin} />}
          {tab === 'wire' && <WireTab rules={selected.wireRules} onChange={r => updateRules('wireRules', r)} readonly={selected.isBuiltin} />}
          {tab === 'layout' && <LayoutTab rules={selected.layoutRules} onChange={r => updateRules('layoutRules', r)} readonly={selected.isBuiltin} />}
          {tab === 'pin' && <PinTab rules={selected.pinRules} onChange={r => updateRules('pinRules', r)} readonly={selected.isBuiltin} />}
        </div>

        {/* 底部操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          <span style={{ fontSize: 11, color: '#a0aec0' }}>
            当前编辑：{selected.name} · 上次保存 {selected.updatedAt.slice(0, 16).replace('T', ' ')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!selected.isBuiltin && (
              <button onClick={() => onDelete(selected.id)} style={{ ...grayBtn, color: '#e53e3e' }}>删除</button>
            )}
            <button onClick={() => onDuplicate(selected.id)} style={grayBtn}>复制</button>
            <button onClick={() => onExport(selected.id)} style={grayBtn}>导出</button>
            <button onClick={handleImportFile} style={grayBtn}>导入</button>
            <button onClick={() => onSetActive(selected.id)} style={accentBtn}>
              {selected.id === activeId ? '✓ 已应用' : '应用到项目'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-tab components ---

function ConnectionTab({ rules, onChange, readonly }: { rules: ConnectionRuleConfig; onChange: (r: ConnectionRuleConfig) => void; readonly: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <FieldGroup label="电器盒包含的元器件类型" desc="选择哪些元器件类型必须包裹在电器盒内部">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {rules.fuseBoxContainedTypes.map(t => (
            <span key={t} style={tagStyle}>
              {TYPE_LABELS[t] || t}
              {!readonly && <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => onChange({ ...rules, fuseBoxContainedTypes: rules.fuseBoxContainedTypes.filter(x => x !== t) })}>✕</span>}
            </span>
          ))}
          {!readonly && (
            <select
              style={selectStyle}
              value=""
              onChange={e => {
                const v = e.target.value as ComponentType;
                if (v && !rules.fuseBoxContainedTypes.includes(v)) {
                  onChange({ ...rules, fuseBoxContainedTypes: [...rules.fuseBoxContainedTypes, v] });
                }
              }}
            >
              <option value="">+ 添加类型</option>
              {ALL_TYPES.filter(t => !rules.fuseBoxContainedTypes.includes(t)).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          )}
        </div>
      </FieldGroup>

      <FieldGroup label="接地位置约束">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['below_controller', 'above_controller', 'free'] as const).map(v => (
            <button
              key={v}
              disabled={readonly}
              onClick={() => onChange({ ...rules, groundPlacement: v })}
              style={rules.groundPlacement === v ? accentBtn : grayBtn}
            >
              {v === 'below_controller' ? '控制器下方' : v === 'above_controller' ? '控制器上方' : '自由放置'}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="电源输出端口定义">
        <table style={tableStyle}>
          <thead>
            <tr style={theadRow}>
              <th style={thStyle}>端口 ID</th>
              <th style={thStyle}>标签</th>
              <th style={thStyle}>说明</th>
              {!readonly && <th style={thStyle}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {rules.powerOutputPorts.map((port, i) => (
              <tr key={port.id} style={tdRow}>
                <td style={tdStyle}>{port.id}</td>
                <td style={tdStyle}>{port.label}</td>
                <td style={tdStyle}>{port.description || '-'}</td>
                {!readonly && (
                  <td style={tdStyle}>
                    <span style={{ color: '#e53e3e', cursor: 'pointer', fontSize: 11 }} onClick={() => {
                      const next = [...rules.powerOutputPorts];
                      next.splice(i, 1);
                      onChange({ ...rules, powerOutputPorts: next });
                    }}>删除</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!readonly && (
          <button style={{ ...grayBtn, marginTop: 8, fontSize: 11 }} onClick={() => {
            const id = prompt('端口 ID：');
            const label = prompt('标签：');
            if (id && label) {
              onChange({ ...rules, powerOutputPorts: [...rules.powerOutputPorts, { id, label }] });
            }
          }}>+ 添加端口</button>
        )}
      </FieldGroup>

      <FieldGroup label="电器盒内元件独立接线" desc="每个保险丝/继电器通过独立线束分别连接到电源对应端口">
        <ToggleSwitch checked={rules.fuseBoxIndependentWiring} onChange={v => !readonly && onChange({ ...rules, fuseBoxIndependentWiring: v })} />
      </FieldGroup>

      <FieldGroup label="连接约束规则">
        {rules.connectionConstraints.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 6, marginBottom: 6 }}>
            <span style={{ ...tagStyle, background: '#FEF3C7', color: '#D97706' }}>{TYPE_LABELS[c.fromType] || c.fromType}</span>
            <span style={{ color: '#a0aec0' }}>→</span>
            <span style={{ ...tagStyle, background: '#FEE2E2', color: '#DC2626' }}>{TYPE_LABELS[c.toType] || c.toType}</span>
            <span style={{ ...tagStyle, background: '#DCFCE7', color: '#16A34A', fontSize: 10 }}>{c.required ? '必须' : '可选'}</span>
            <span style={{ fontSize: 11, color: '#718096' }}>{c.description}</span>
          </div>
        ))}
      </FieldGroup>
    </div>
  );
}

function WireTab({ rules, onChange, readonly }: { rules: WireRuleConfig; onChange: (r: WireRuleConfig) => void; readonly: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <FieldGroup label="线色编码映射表">
        <table style={tableStyle}>
          <thead>
            <tr style={theadRow}>
              <th style={thStyle}>编码</th>
              <th style={thStyle}>色值</th>
              <th style={thStyle}>预览</th>
              {!readonly && <th style={thStyle}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {Object.entries(rules.colorCodeMap).map(([code, color]) => (
              <tr key={code} style={tdRow}>
                <td style={tdStyle}>{code}</td>
                <td style={tdStyle}>
                  {readonly ? color : (
                    <input type="color" value={color} onChange={e => onChange({ ...rules, colorCodeMap: { ...rules.colorCodeMap, [code]: e.target.value } })} />
                  )}
                </td>
                <td style={tdStyle}><div style={{ width: 24, height: 24, background: color, borderRadius: 4, border: '1px solid #e2e8f0' }} /></td>
                {!readonly && (
                  <td style={tdStyle}>
                    <span style={{ color: '#e53e3e', cursor: 'pointer', fontSize: 11 }} onClick={() => {
                      const next = { ...rules.colorCodeMap };
                      delete next[code];
                      onChange({ ...rules, colorCodeMap: next });
                    }}>删除</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </FieldGroup>

      <div style={{ display: 'flex', gap: 32 }}>
        <FieldGroup label="复色分隔符">
          <input
            value={rules.multiColorSeparator}
            onChange={e => !readonly && onChange({ ...rules, multiColorSeparator: e.target.value })}
            style={{ ...inputStyle, width: 60, textAlign: 'center' }}
            readOnly={readonly}
          />
        </FieldGroup>
        <FieldGroup label="主线宽度 (px)">
          <input
            type="number" min={1} max={10} value={rules.primaryWidth}
            onChange={e => !readonly && onChange({ ...rules, primaryWidth: Number(e.target.value) })}
            style={{ ...inputStyle, width: 80 }}
            readOnly={readonly}
          />
        </FieldGroup>
        <FieldGroup label="复线宽度 (px)">
          <input
            type="number" min={0.5} max={6} step={0.5} value={rules.secondaryWidth}
            onChange={e => !readonly && onChange({ ...rules, secondaryWidth: Number(e.target.value) })}
            style={{ ...inputStyle, width: 80 }}
            readOnly={readonly}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="线束标签格式" desc="支持 {colorCode} 和 {gauge} 变量">
        <input
          value={rules.labelFormat}
          onChange={e => !readonly && onChange({ ...rules, labelFormat: e.target.value })}
          style={{ ...inputStyle, width: 300 }}
          readOnly={readonly}
        />
      </FieldGroup>

      <FieldGroup label="在线束上显示标签">
        <ToggleSwitch checked={rules.labelVisible} onChange={v => !readonly && onChange({ ...rules, labelVisible: v })} />
      </FieldGroup>
    </div>
  );
}

function LayoutTab({ rules, onChange, readonly }: { rules: LayoutRuleConfig; onChange: (r: LayoutRuleConfig) => void; readonly: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <FieldGroup label="分层模式">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['auto', 'template'] as const).map(v => (
            <button
              key={v}
              disabled={readonly}
              onClick={() => onChange({ ...rules, layerMode: v })}
              style={(rules.layerMode ?? 'template') === v ? accentBtn : grayBtn}
            >
              {v === 'auto' ? '自动分层' : '手动模板'}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="默认绘制方向">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['vertical', 'horizontal', 'auto'] as const).map(v => (
            <button
              key={v}
              disabled={readonly}
              onClick={() => onChange({ ...rules, defaultDirection: v })}
              style={rules.defaultDirection === v ? accentBtn : grayBtn}
            >
              {v === 'vertical' ? '垂直' : v === 'horizontal' ? '水平' : '自动'}
            </button>
          ))}
        </div>
      </FieldGroup>

      <div style={{ display: 'flex', gap: 32 }}>
        <FieldGroup label="层间距 (px)">
          <input
            type="number" min={40} max={300} value={rules.layerSpacing}
            onChange={e => !readonly && onChange({ ...rules, layerSpacing: Number(e.target.value) })}
            style={{ ...inputStyle, width: 80 }}
            readOnly={readonly}
          />
        </FieldGroup>
        <FieldGroup label="层内间距 (px)">
          <input
            type="number" min={30} max={200} value={rules.nodeSpacing}
            onChange={e => !readonly && onChange({ ...rules, nodeSpacing: Number(e.target.value) })}
            style={{ ...inputStyle, width: 80 }}
            readOnly={readonly}
          />
        </FieldGroup>
        <FieldGroup label="同行间隙 (px)" desc="同一行元器件之间的最小间隙">
          <input
            type="number" min={0} max={100} value={rules.inlineGap}
            onChange={e => !readonly && onChange({ ...rules, inlineGap: Number(e.target.value) })}
            style={{ ...inputStyle, width: 80 }}
            readOnly={readonly}
          />
        </FieldGroup>
        <FieldGroup label="迭代次数">
          <input
            type="number" min={1} max={20} value={rules.barycenterIterations}
            onChange={e => !readonly && onChange({ ...rules, barycenterIterations: Number(e.target.value) })}
            style={{ ...inputStyle, width: 80 }}
            readOnly={readonly}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="排序策略">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['barycenter', 'manual', 'adjacency'] as const).map(v => (
            <button
              key={v}
              disabled={readonly}
              onClick={() => onChange({ ...rules, sortStrategy: v })}
              style={rules.sortStrategy === v ? accentBtn : grayBtn}
            >
              {v === 'barycenter' ? '重心法' : v === 'manual' ? '手动' : '邻接法'}
            </button>
          ))}
        </div>
      </FieldGroup>

      {(rules.layerMode ?? 'template') === 'template' && (
      <FieldGroup label="层级模板" desc="点击类型标签可添加/移除，拖拽行可调整顺序">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rules.layerTemplate.map((layer, i) => (
            <div key={layer.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, color: '#a0aec0', width: 20 }}>{i + 1}</span>
              {readonly ? (
                <span style={{ fontSize: 12, fontWeight: 500, width: 80 }}>{layer.label}</span>
              ) : (
                <input
                  value={layer.label}
                  onChange={e => {
                    const next = [...rules.layerTemplate];
                    next[i] = { ...next[i], label: e.target.value };
                    onChange({ ...rules, layerTemplate: next });
                  }}
                  style={{ ...inputStyle, width: 80, padding: '2px 6px' }}
                />
              )}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                {ALL_TYPES.map(t => {
                  const active = layer.types.includes(t);
                  return (
                    <span
                      key={t}
                      onClick={() => {
                        if (readonly) return;
                        const next = [...rules.layerTemplate];
                        const types = active
                          ? layer.types.filter(x => x !== t)
                          : [...layer.types, t];
                        next[i] = { ...next[i], types };
                        onChange({ ...rules, layerTemplate: next });
                      }}
                      style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10,
                        cursor: readonly ? 'default' : 'pointer',
                        background: active ? '#DBEAFE' : '#f7fafc',
                        color: active ? '#3182ce' : '#a0aec0',
                        border: active ? '1px solid #93C5FD' : '1px solid #e2e8f0',
                        transition: 'all 0.1s',
                      }}
                    >
                      {TYPE_LABELS[t] || t}
                    </span>
                  );
                })}
              </div>
              {!readonly && (
                <span
                  style={{ color: '#e53e3e', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}
                  onClick={() => {
                    const next = rules.layerTemplate.filter((_, j) => j !== i);
                    onChange({ ...rules, layerTemplate: next });
                  }}
                >
                  删除
                </span>
              )}
            </div>
          ))}
          {!readonly && (
            <button
              onClick={() => {
                const next = [...rules.layerTemplate, { id: `layer_${Date.now()}`, label: '新层级', types: [] as ComponentType[] }];
                onChange({ ...rules, layerTemplate: next });
              }}
              style={{ ...grayBtn, fontSize: 11, padding: '6px 12px', alignSelf: 'flex-start' }}
            >
              + 添加层级
            </button>
          )}
        </div>
      </FieldGroup>
      )}

      {(rules.layerMode ?? 'template') === 'auto' && (
        <div style={{ padding: 12, background: '#F0FFF4', borderRadius: 8, border: '1px solid #C6F6D5' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#276749', marginBottom: 4 }}>自动分层模式</div>
          <div style={{ fontSize: 11, color: '#48BB78' }}>
            根据电路拓扑自动推断层级：电源最顶 → 保护/控制 → 控制器居中 → 外围器件 → 连接器 → 接地最底
          </div>
        </div>
      )}
    </div>
  );
}

function PinTab({ rules, onChange, readonly }: { rules: PinRuleConfig; onChange: (r: PinRuleConfig) => void; readonly: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <FieldGroup label="标签位置">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['outside', 'inside'] as const).map(v => (
            <button
              key={v}
              disabled={readonly}
              onClick={() => onChange({ ...rules, labelPosition: v })}
              style={rules.labelPosition === v ? accentBtn : grayBtn}
            >
              {v === 'outside' ? '外部' : '内部'}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="标签格式" desc="支持 {pinId}、{nodeId}、{pinIndex}">
        <input
          value={rules.labelFormat}
          onChange={e => !readonly && onChange({ ...rules, labelFormat: e.target.value })}
          style={{ ...inputStyle, width: 300 }}
          readOnly={readonly}
        />
      </FieldGroup>

      <FieldGroup label="控制器内显示针脚">
        <ToggleSwitch checked={rules.showPinsInsideController} onChange={v => !readonly && onChange({ ...rules, showPinsInsideController: v })} />
      </FieldGroup>

      <FieldGroup label="方向自动判定" desc="根据线束走向自动判定针脚方向">
        <ToggleSwitch checked={rules.autoDetectDirection} onChange={v => !readonly && onChange({ ...rules, autoDetectDirection: v })} />
      </FieldGroup>
    </div>
  );
}

// --- Shared UI components ---

function FieldGroup({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a202c' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#a0aec0' }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
        background: checked ? '#3182ce' : '#cbd5e0',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        position: 'absolute', top: 2,
        left: checked ? 20 : 2,
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

// --- Styles ---

const accentBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#3182ce', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};

const accentBtnSm: React.CSSProperties = {
  padding: '4px 10px', background: '#3182ce', color: '#fff', border: 'none',
  borderRadius: 4, cursor: 'pointer', fontSize: 11,
};

const grayBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#edf2f7', color: '#4a5568', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};

const searchInput: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
  fontSize: 12, outline: 'none',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
  fontSize: 12, outline: 'none',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 12, border: '1px solid #e2e8f0',
  fontSize: 11, outline: 'none', cursor: 'pointer',
};

const tagStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 12, background: '#DBEAFE',
  color: '#3182ce', fontSize: 11, display: 'inline-flex', alignItems: 'center',
};

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden',
};

const theadRow: React.CSSProperties = { background: '#f7fafc' };
const thStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 11, fontWeight: 500, color: '#718096', textAlign: 'left' };
const tdRow: React.CSSProperties = { borderTop: '1px solid #edf2f7' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 12 };
