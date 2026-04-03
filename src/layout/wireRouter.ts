import type { ComponentType, CircuitNode, NodePosition, Wire } from '../types';

export interface RoutedWire {
  wire: Wire;
  path: string;
  labelX: number;
  labelY: number;
}

/**
 * Port offsets per node type: { top, bottom } relative to node center.
 * Wire connects to top port when going upward, bottom port when going downward.
 */
const PORT_OFFSETS: Record<ComponentType, { top: number; bottom: number }> = {
  power:          { top: -18, bottom: 20 },
  ground:         { top: -20, bottom: 12 },
  fuse:           { top: -28, bottom: 28 },
  relay:          { top: -34, bottom: 34 },
  switch:         { top: -28, bottom: 28 },
  splice:         { top: -24, bottom: 24 },
  connector:      { top: -34, bottom: 34 },
  connector_plug: { top: -24, bottom: 24 },
  ecu:            { top: -38, bottom: 38 },
};

function getPortY(nodeY: number, peerY: number, type: ComponentType): number {
  const offsets = PORT_OFFSETS[type] ?? { top: -20, bottom: 20 };
  // If peer is above, connect from top port; if below, from bottom port
  if (peerY < nodeY) return nodeY + offsets.top;
  if (peerY > nodeY) return nodeY + offsets.bottom;
  // Same Y: use bottom by default
  return nodeY + offsets.bottom;
}

/**
 * 优化布线：
 * - 同 X 轴直连
 * - 不同 X 轴：为每条线分配不同的中间 Y 通道，避免重叠
 * - 导线连接到节点的引脚端口而非中心
 */
export function routeWires(
  wires: Wire[],
  positions: Map<string, NodePosition>,
  nodeMap?: Map<string, CircuitNode>,
): RoutedWire[] {
  const needsChannel: { wire: Wire; fromPos: { x: number; y: number }; toPos: { x: number; y: number }; midY: number }[] = [];
  const straight: RoutedWire[] = [];

  for (const wire of wires) {
    const fromCenter = positions.get(wire.from.nodeId);
    const toCenter = positions.get(wire.to.nodeId);
    if (!fromCenter || !toCenter) continue;

    const fromNode = nodeMap?.get(wire.from.nodeId);
    const toNode = nodeMap?.get(wire.to.nodeId);

    // Compute port positions
    const fromPortY = fromNode
      ? getPortY(fromCenter.y, toCenter.y, fromNode.type)
      : fromCenter.y;
    const toPortY = toNode
      ? getPortY(toCenter.y, fromCenter.y, toNode.type)
      : toCenter.y;

    const fromPos = { x: fromCenter.x, y: fromPortY };
    const toPos = { x: toCenter.x, y: toPortY };

    if (fromCenter.x === toCenter.x) {
      straight.push({
        wire,
        path: `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`,
        labelX: fromPos.x + 8,
        labelY: (fromPos.y + toPos.y) / 2 - 4,
      });
    } else {
      const midY = (fromPos.y + toPos.y) / 2;
      needsChannel.push({ wire, fromPos, toPos, midY });
    }
  }

  // 按 midY 分组，同组内分配通道
  needsChannel.sort((a, b) => a.midY - b.midY || a.fromPos.x - b.fromPos.x);

  const channelSpacing = 12;
  const grouped = new Map<number, typeof needsChannel>();
  for (const item of needsChannel) {
    const key = Math.round(item.midY / 10) * 10;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const routed: RoutedWire[] = [...straight];

  for (const [baseMidY, group] of grouped) {
    const totalWidth = (group.length - 1) * channelSpacing;
    const startOffset = -totalWidth / 2;

    group.forEach((item, i) => {
      const channelY = baseMidY + startOffset + i * channelSpacing;
      const { wire, fromPos, toPos } = item;
      const path = `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${channelY} L ${toPos.x} ${channelY} L ${toPos.x} ${toPos.y}`;
      routed.push({
        wire,
        path,
        labelX: (fromPos.x + toPos.x) / 2 + 8,
        labelY: channelY - 4,
      });
    });
  }

  return routed;
}
