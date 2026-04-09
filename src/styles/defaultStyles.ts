import type { ComponentType, NodeStyleConfig, StyleConfig, WireRuleConfig } from '../types';

// 默认线色映射（当无模板时的 fallback）
export const COLOR_NAME_MAP: Record<string, string> = {
  '白': '#ffffff', '黑': '#333333', '红': '#e53e3e', '蓝': '#3182ce',
  '绿': '#38a169', '黄': '#d69e2e', '棕': '#8B4513', '灰': '#718096',
  '橙': '#dd6b20', '粉': '#ed64a6', '紫': '#805ad5',
  R: '#e53e3e', Br: '#8B4513', Y: '#d69e2e', Gr: '#718096',
  B: '#3182ce', W: '#ffffff', G: '#38a169', O: '#dd6b20',
  P: '#ed64a6', V: '#805ad5',
};

export const WIRE_COLORS: Record<string, string> = {
  R: '#e53e3e', Br: '#8B4513', Y: '#d69e2e', Gr: '#718096',
  B: '#3182ce', W: '#a0aec0', G: '#38a169',
};

/** 解析线色代码，支持模板自定义映射 */
export function parseWireColor(
  colorCode: string,
  wireRules?: WireRuleConfig,
): { primary: string; secondary?: string } {
  const colorMap = wireRules?.colorCodeMap ?? COLOR_NAME_MAP;
  const sep = wireRules?.multiColorSeparator ?? '/';

  if (colorCode.includes(sep)) {
    const [p, s] = colorCode.split(sep);
    return {
      primary: colorMap[p] || COLOR_NAME_MAP[p] || '#333',
      secondary: colorMap[s] || COLOR_NAME_MAP[s] || '#333',
    };
  }
  return { primary: colorMap[colorCode] || COLOR_NAME_MAP[colorCode] || '#333' };
}

const NODE_TYPE_STYLES: Record<string, NodeStyleConfig> = {
  power: { fill: 'none', stroke: '#e53e3e', strokeWidth: 2, textColor: '#333', fontSize: 11 },
  ground: { fill: 'none', stroke: '#333', strokeWidth: 2, textColor: '#333', fontSize: 11 },
  fuse: { fill: '#fff3cd', stroke: '#d69e2e', strokeWidth: 2, textColor: '#333', fontSize: 9 },
  relay: { fill: '#e8f4fd', stroke: '#2b6cb0', strokeWidth: 2, textColor: '#2b6cb0', fontSize: 10 },
  switch: { fill: 'none', stroke: '#805ad5', strokeWidth: 2, textColor: '#553c9a', fontSize: 10 },
  splice: { fill: '#333', stroke: '#333', strokeWidth: 2, textColor: '#333', fontSize: 10 },
  connector: { fill: '#ebf8ff', stroke: '#3182ce', strokeWidth: 2, textColor: '#2b6cb0', fontSize: 11 },
  connector_plug: { fill: '#fefcbf', stroke: '#b7791f', strokeWidth: 2, textColor: '#744210', fontSize: 10 },
  ecu: { fill: '#f0fff4', stroke: '#38a169', strokeWidth: 2, textColor: '#276749', fontSize: 11 },
};

export const defaultStyleConfig: StyleConfig = {
  defaultNode: { fill: '#eee', stroke: '#999', strokeWidth: 1, textColor: '#333', fontSize: 10 },
  nodeByType: NODE_TYPE_STYLES as Partial<Record<ComponentType, NodeStyleConfig>>,
  defaultWire: { opacity: 1 },
};

/** 解析节点最终样式：全局默认 → 按类型 → 按 ID */
export function resolveNodeStyle(
  nodeId: string,
  nodeType: ComponentType,
  config: StyleConfig,
): Required<NodeStyleConfig> {
  const base: Required<NodeStyleConfig> = {
    fill: '#eee', stroke: '#999', strokeWidth: 1, textColor: '#333', fontSize: 10,
  };
  Object.assign(base, config.defaultNode);
  Object.assign(base, config.nodeByType?.[nodeType]);
  Object.assign(base, config.nodeById?.[nodeId]);
  return base;
}

/** 解析线路最终样式，支持模板配置 */
export function resolveWireStyle(
  wireId: string,
  wireColor: string,
  _gauge: number,
  config: StyleConfig,
  wireRules?: WireRuleConfig,
): { color: string; strokeWidth: number; dashArray?: string; opacity: number; secondaryColor?: string } {
  const parsed = parseWireColor(wireColor, wireRules);
  const baseWidth = wireRules?.primaryWidth ?? 4;
  const result = {
    color: parsed.primary,
    strokeWidth: baseWidth,
    dashArray: undefined as string | undefined,
    opacity: config.defaultWire?.opacity ?? 1,
    secondaryColor: parsed.secondary,
  };
  const override = config.wireById?.[wireId];
  if (override) {
    if (override.color) result.color = override.color;
    if (override.strokeWidth) result.strokeWidth = override.strokeWidth;
    if (override.dashArray) result.dashArray = override.dashArray;
    if (override.opacity !== undefined) result.opacity = override.opacity;
  }
  return result;
}

/** 格式化线束标签 */
export function formatWireLabel(
  colorCode: string,
  gauge: number,
  wireRules?: WireRuleConfig,
): string {
  const fmt = wireRules?.labelFormat ?? '{colorCode} {gauge}mm²';
  return fmt
    .replace('{colorCode}', colorCode)
    .replace('{gauge}', String(gauge));
}
