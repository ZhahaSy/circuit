import type { ComponentType, CircuitNode, NodePosition, Wire } from '../types';

export interface RoutedWire {
  wire: Wire;
  path: string;
  labelX: number;
  labelY: number;
  /** If this wire connects to a power bus, the connection dot position */
  busDot?: { x: number; y: number };
}

const PORT_OFFSETS: Record<ComponentType, { top: number; bottom: number }> = {
  power:          { top: 0, bottom: 0 },  // power nodes sit on bus line, no offset
  ground:         { top: -20, bottom: 12 },
  fuse:           { top: -28, bottom: 28 },
  relay:          { top: -34, bottom: 34 },
  switch:         { top: -28, bottom: 28 },
  splice:         { top: -24, bottom: 24 },
  connector:      { top: -34, bottom: 34 },
  connector_plug: { top: -24, bottom: 24 },
  ecu:            { top: -38, bottom: 38 },
  sensor:         { top: -24, bottom: 24 },
  actuator:       { top: -24, bottom: 24 },
  resistor:       { top: -20, bottom: 20 },
  capacitor:      { top: -20, bottom: 20 },
  diode:          { top: -20, bottom: 20 },
  transistor:     { top: -20, bottom: 20 },
  ic:             { top: -30, bottom: 30 },
};

function getPortY(nodeY: number, peerY: number, type: ComponentType): number {
  const offsets = PORT_OFFSETS[type] ?? { top: -20, bottom: 20 };
  if (peerY < nodeY) return nodeY + offsets.top;
  if (peerY > nodeY) return nodeY + offsets.bottom;
  return nodeY + offsets.bottom;
}

const EPS = 5; // tolerance for "same coordinate"

/** Deduplicate consecutive near-identical points, then remove collinear midpoints */
function simplifyPath(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points;

  // Step 1: deduplicate consecutive points that are essentially the same
  const deduped = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(points[i].x - prev.x) > EPS || Math.abs(points[i].y - prev.y) > EPS) {
      deduped.push(points[i]);
    }
  }
  if (deduped.length <= 2) return deduped;

  // Step 2: remove collinear midpoints (3 points on same horizontal or vertical line)
  const clean = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = clean[clean.length - 1];
    const cur = deduped[i];
    const next = deduped[i + 1];
    const collinearX = Math.abs(prev.x - cur.x) < EPS && Math.abs(cur.x - next.x) < EPS;
    const collinearY = Math.abs(prev.y - cur.y) < EPS && Math.abs(cur.y - next.y) < EPS;
    if (!collinearX && !collinearY) {
      clean.push(cur);
    }
  }
  clean.push(deduped[deduped.length - 1]);
  return clean;
}

export function routeWires(
  wires: Wire[],
  positions: Map<string, NodePosition>,
  nodeMap?: Map<string, CircuitNode>,
  channelSpacing = 12,
): RoutedWire[] {
  const powerNodeIds = new Set<string>();
  if (nodeMap) {
    for (const [id, node] of nodeMap) {
      if (node.type === 'power') powerNodeIds.add(id);
    }
  }

  const needsChannel: { wire: Wire; fromPos: { x: number; y: number }; toPos: { x: number; y: number }; midY: number; busDot?: { x: number; y: number } }[] = [];
  const straight: RoutedWire[] = [];

  for (const wire of wires) {
    const fromCenter = positions.get(wire.from.nodeId);
    const toCenter = positions.get(wire.to.nodeId);
    if (!fromCenter || !toCenter) continue;

    const fromNode = nodeMap?.get(wire.from.nodeId);
    const toNode = nodeMap?.get(wire.to.nodeId);
    const fromIsPower = powerNodeIds.has(wire.from.nodeId);
    const toIsPower = powerNodeIds.has(wire.to.nodeId);

    // For power bus connections: wire goes straight down from bus line
    // to the connected node's top port
    if (fromIsPower || toIsPower) {
      const powerNodeId = fromIsPower ? wire.from.nodeId : wire.to.nodeId;
      const otherNodeId = fromIsPower ? wire.to.nodeId : wire.from.nodeId;
      const powerPos = positions.get(powerNodeId)!;
      const otherCenter = positions.get(otherNodeId)!;
      const otherNode = nodeMap?.get(otherNodeId);

      // The wire drops from the bus line at the other node's X position
      const busX = otherCenter.x;
      const busY = powerPos.y;
      const otherPortY = otherNode
        ? getPortY(otherCenter.y, busY, otherNode.type)
        : otherCenter.y;

      const path = `M ${busX} ${busY} L ${busX} ${otherPortY}`;
      straight.push({
        wire,
        path,
        labelX: busX + 8,
        labelY: (busY + otherPortY) / 2 - 4,
        busDot: { x: busX, y: busY },
      });
      continue;
    }

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

  needsChannel.sort((a, b) => a.midY - b.midY || a.fromPos.x - b.fromPos.x);

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
      const { wire, fromPos, toPos } = item;

      // Decide routing shape:
      // L-shape (1 bend) when possible, Z-shape (2 bends) only when needed
      let points: { x: number; y: number }[];

      if (group.length === 1) {
        // Single wire in this channel group — use L-shape
        // Pick the L that bends at (fromX, toY) or (toX, fromY)
        // Choose the one where the horizontal segment is closer to the midpoint
        points = [
          fromPos,
          { x: fromPos.x, y: toPos.y },
          toPos,
        ];
      } else {
        // Multiple wires sharing similar midY — use Z-shape with channel separation
        let channelY = baseMidY + startOffset + i * channelSpacing;

        // Snap channelY to endpoint if close enough
        if (Math.abs(channelY - fromPos.y) < Math.abs(channelY - toPos.y)) {
          // channelY is closer to from — snap to from.y for L-shape
          if (Math.abs(channelY - fromPos.y) < 30) {
            channelY = fromPos.y;
          }
        } else {
          // channelY is closer to to — snap to to.y for L-shape
          if (Math.abs(channelY - toPos.y) < 30) {
            channelY = toPos.y;
          }
        }

        points = [
          fromPos,
          { x: fromPos.x, y: channelY },
          { x: toPos.x, y: channelY },
          toPos,
        ];
      }

      const clean = simplifyPath(points);
      const path = clean.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const midPt = clean[Math.floor(clean.length / 2)];
      routed.push({
        wire,
        path,
        labelX: midPt.x + 8,
        labelY: midPt.y - 4,
      });
    });
  }

  return routed;
}
