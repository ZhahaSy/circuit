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
  power: { fill: 'none', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 10 },
  ground: { fill: 'none', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 10 },
  fuse: { fill: '#ccc', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 8 },
  relay: { fill: '#fff', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 9 },
  switch: { fill: 'none', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 9 },
  splice: { fill: '#fff', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 9 },
  connector: { fill: '#fff', stroke: '#040000', strokeWidth: 1, textColor: '#333', fontSize: 9 },
  connector_plug: { fill: '#fff', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 9 },
  ecu: { fill: '#ccc', stroke: '#000', strokeWidth: 0.5, textColor: '#333', fontSize: 10 },
  can: { fill: 'none', stroke: '#040000', strokeWidth: 1.2, textColor: '#333', fontSize: 9 },
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
  wireColor: string | undefined,
  _gauge: number | undefined,
  config: StyleConfig,
  wireRules?: WireRuleConfig,
): { color: string; strokeWidth: number; dashArray?: string; opacity: number; secondaryColor?: string } {
  // 无 color 和 gauge 时使用 1px 黑色线
  if (!wireColor && _gauge == null) {
    return {
      color: '#333333',
      strokeWidth: 1,
      dashArray: undefined,
      opacity: config.defaultWire?.opacity ?? 1,
      secondaryColor: undefined,
    };
  }
  const parsed = parseWireColor(wireColor || '', wireRules);
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
