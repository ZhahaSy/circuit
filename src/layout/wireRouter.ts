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
  power:          { top: 0, bottom: 0 },
  ground:         { top: -20, bottom: 12 },
  fuse:           { top: -28, bottom: 28 },
  relay:          { top: -34, bottom: 34 },
  switch:         { top: -28, bottom: 28 },
  splice:         { top: -4, bottom: 4 },
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
  can:            { top: -14, bottom: 14 },
};

function getPortY(nodeY: number, peerY: number, type: ComponentType): number {
  const offsets = PORT_OFFSETS[type] ?? { top: -20, bottom: 20 };
  if (peerY < nodeY) return nodeY + offsets.top;
  if (peerY > nodeY) return nodeY + offsets.bottom;
  return nodeY + offsets.bottom;
}

const EPS = 5;

/** Deduplicate consecutive near-identical points, then remove collinear midpoints */
function simplifyPath(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points;

  const deduped = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(points[i].x - prev.x) > EPS || Math.abs(points[i].y - prev.y) > EPS) {
      deduped.push(points[i]);
    }
  }
  if (deduped.length <= 2) return deduped;

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

/** Wire spacing for parallel wires sharing the same column or channel */
const WIRE_SPACING = 8;

export function routeWires(
  wires: Wire[],
  positions: Map<string, NodePosition>,
  nodeMap?: Map<string, CircuitNode>,
  channelSpacing = 12,
  externalPinXMap?: Map<string, number>,
): RoutedWire[] {
  const powerNodeIds = new Set<string>();
  if (nodeMap) {
    for (const [id, node] of nodeMap) {
      if (node.type === 'power') powerNodeIds.add(id);
    }
  }

  // Use external pinXMap if provided (single source of truth from pinResolver)
  const pinXMap = externalPinXMap ?? new Map<string, number>();

  // Helper: get pin X offset from center
  // Also checks virtual pin entries (for no-pin endpoints aligned by pinResolver)
  function pinXOffsetForWire(nodeId: string, pin: string | undefined, wireId: string): number {
    const key = pin ? `${nodeId}:${pin}` : `${nodeId}:__wire_${wireId}`;
    const absX = pinXMap.get(key);
    if (absX == null) return 0;
    const center = positions.get(nodeId);
    if (!center) return 0;
    return absX - center.x;
  }

  // ── Phase 1: Classify wires ──
  // Track how many wires share the same vertical column (same X)
  // so we can offset them to avoid overlap.

  // Group power bus wires by target node X
  const busWiresByX = new Map<number, { wire: Wire; busX: number; busY: number; otherPortY: number; otherNodeId: string }[]>();
  // Group straight vertical wires by X
  const straightByX = new Map<number, { wire: Wire; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }[]>();
  // Non-vertical wires that need channel routing
  const needsChannel: { wire: Wire; fromPos: { x: number; y: number }; toPos: { x: number; y: number }; midY: number }[] = [];

  for (const wire of wires) {
    const fromCenter = positions.get(wire.from.nodeId);
    const toCenter = positions.get(wire.to.nodeId);
    if (!fromCenter || !toCenter) continue;

    const fromNode = nodeMap?.get(wire.from.nodeId);
    const toNode = nodeMap?.get(wire.to.nodeId);
    const fromIsPower = powerNodeIds.has(wire.from.nodeId);
    const toIsPower = powerNodeIds.has(wire.to.nodeId);

    if (fromIsPower || toIsPower) {
      const powerNodeId = fromIsPower ? wire.from.nodeId : wire.to.nodeId;
      const otherNodeId = fromIsPower ? wire.to.nodeId : wire.from.nodeId;
      const otherPin = fromIsPower ? wire.to.pin : wire.from.pin;
      const powerPos = positions.get(powerNodeId)!;
      const otherCenter = positions.get(otherNodeId)!;
      const otherNode = nodeMap?.get(otherNodeId);

      const pOffset = pinXOffsetForWire(otherNodeId, otherPin, wire.id);
      const busX = otherCenter.x + pOffset;
      const busY = powerPos.y;
      const otherPortY = otherNode
        ? getPortY(otherCenter.y, busY, otherNode.type)
        : otherCenter.y;

      const key = Math.round(busX);
      if (!busWiresByX.has(key)) busWiresByX.set(key, []);
      busWiresByX.get(key)!.push({ wire, busX, busY, otherPortY, otherNodeId });
      continue;
    }

    const fromPortY = fromNode
      ? getPortY(fromCenter.y, toCenter.y, fromNode.type)
      : fromCenter.y;
    const toPortY = toNode
      ? getPortY(toCenter.y, fromCenter.y, toNode.type)
      : toCenter.y;

    const fromPinOffset = pinXOffsetForWire(wire.from.nodeId, wire.from.pin, wire.id);
    const toPinOffset = pinXOffsetForWire(wire.to.nodeId, wire.to.pin, wire.id);

    const fromPos = { x: fromCenter.x + fromPinOffset, y: fromPortY };
    const toPos = { x: toCenter.x + toPinOffset, y: toPortY };

    if (Math.abs(fromPos.x - toPos.x) < EPS) {
      // Vertical wire — group by X for offset
      const key = Math.round(fromPos.x);
      if (!straightByX.has(key)) straightByX.set(key, []);
      straightByX.get(key)!.push({ wire, fromPos, toPos });
    } else {
      const midY = (fromPos.y + toPos.y) / 2;
      needsChannel.push({ wire, fromPos, toPos, midY });
    }
  }

  // ── Phase 1.5: Move vertical wires that converge with non-vertical wires ──
  // If a vertical wire shares an endpoint with a non-vertical wire, move it to
  // needsChannel so convergence detection in Phase 4 can handle them together.
  const channelEndpoints = new Set<string>();
  for (const item of needsChannel) {
    channelEndpoints.add(`${Math.round(item.fromPos.x)},${Math.round(item.fromPos.y)}`);
    channelEndpoints.add(`${Math.round(item.toPos.x)},${Math.round(item.toPos.y)}`);
  }
  for (const [key, group] of straightByX) {
    const remaining: typeof group = [];
    for (const item of group) {
      const fromKey = `${Math.round(item.fromPos.x)},${Math.round(item.fromPos.y)}`;
      const toKey = `${Math.round(item.toPos.x)},${Math.round(item.toPos.y)}`;
      if (channelEndpoints.has(fromKey) || channelEndpoints.has(toKey)) {
        const midY = (item.fromPos.y + item.toPos.y) / 2;
        needsChannel.push({ wire: item.wire, fromPos: item.fromPos, toPos: item.toPos, midY });
      } else {
        remaining.push(item);
      }
    }
    if (remaining.length === 0) {
      straightByX.delete(key);
    } else {
      straightByX.set(key, remaining);
    }
  }

  const routed: RoutedWire[] = [];

  // ── Phase 2: Route power bus wires with X offset ──
  for (const [, group] of busWiresByX) {
    const n = group.length;
    const totalOffset = (n - 1) * WIRE_SPACING;
    group.forEach((item, i) => {
      const xOffset = -totalOffset / 2 + i * WIRE_SPACING;
      const x = item.busX + xOffset;
      const path = `M ${x} ${item.busY} L ${x} ${item.otherPortY}`;
      routed.push({
        wire: item.wire,
        path,
        labelX: x + 8,
        labelY: (item.busY + item.otherPortY) / 2 - 4,
        busDot: { x, y: item.busY },
      });
    });
  }

  // ── Phase 3: Route straight vertical wires with X offset ──
  // Only offset wires whose Y ranges actually overlap AND are not serial (sharing an endpoint)
  for (const [, group] of straightByX) {
    // Build overlap clusters: wires that share overlapping Y ranges
    const items = group.map(item => ({
      ...item,
      minY: Math.min(item.fromPos.y, item.toPos.y),
      maxY: Math.max(item.fromPos.y, item.toPos.y),
    }));
    items.sort((a, b) => a.minY - b.minY);

    // Check if two wires are serial (share an endpoint node)
    function areSerial(a: typeof items[0], b: typeof items[0]): boolean {
      const aNodes = [a.wire.from.nodeId, a.wire.to.nodeId];
      const bNodes = [b.wire.from.nodeId, b.wire.to.nodeId];
      return aNodes.some(n => bNodes.includes(n));
    }

    // Greedy clustering: group wires with overlapping Y ranges, but NOT serial wires
    const clusters: typeof items[] = [];
    for (const item of items) {
      let placed = false;
      for (const cluster of clusters) {
        const clusterMaxY = Math.max(...cluster.map(c => c.maxY));
        // Only cluster if overlapping AND not serial with any wire in the cluster
        if (item.minY < clusterMaxY - EPS && !cluster.some(c => areSerial(c, item))) {
          cluster.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([item]);
    }

    for (const cluster of clusters) {
      const n = cluster.length;
      const totalOffset = (n - 1) * WIRE_SPACING;
      cluster.forEach((item, i) => {
        const xOffset = -totalOffset / 2 + i * WIRE_SPACING;
        const fromX = item.fromPos.x + xOffset;
        const toX = item.toPos.x + xOffset;
        const path = `M ${fromX} ${item.fromPos.y} L ${toX} ${item.toPos.y}`;
        routed.push({
          wire: item.wire,
          path,
          labelX: fromX + 8,
          labelY: (item.fromPos.y + item.toPos.y) / 2 - 4,
        });
      });
    }
  }

  // ── Phase 4: Route non-vertical wires ──
  // First, detect convergence groups: wires sharing the same endpoint
  // key = rounded "x,y" of the shared endpoint
  const convergeByTo = new Map<string, typeof needsChannel>();
  const convergeByFrom = new Map<string, typeof needsChannel>();
  for (const item of needsChannel) {
    const toKey = `${Math.round(item.toPos.x)},${Math.round(item.toPos.y)}`;
    if (!convergeByTo.has(toKey)) convergeByTo.set(toKey, []);
    convergeByTo.get(toKey)!.push(item);
    const fromKey = `${Math.round(item.fromPos.x)},${Math.round(item.fromPos.y)}`;
    if (!convergeByFrom.has(fromKey)) convergeByFrom.set(fromKey, []);
    convergeByFrom.get(fromKey)!.push(item);
  }

  // Identify wires that belong to a convergence group (2+ wires sharing an endpoint)
  const handledWires = new Set<string>();

  // Route convergence groups (shared toPos)
  // Pattern: vertical → horizontal → 45° diagonal into convergence point
  // Like: M(fx,fy) → L(fx, foldY) → L(diagX, foldY) → L(tx, ty)
  for (const [, group] of convergeByTo) {
    if (group.length < 2) continue;
    group.sort((a, b) => Math.abs(a.fromPos.x - a.toPos.x) - Math.abs(b.fromPos.x - b.toPos.x));

    const DIAG_LEN = 10; // 45° diagonal segment length
    group.forEach((item, i) => {
      const { wire, fromPos, toPos } = item;
      handledWires.add(wire.id);

      let points: { x: number; y: number }[];
      if (Math.abs(fromPos.x - toPos.x) < EPS) {
        // Already vertical — straight line
        points = [fromPos, toPos];
      } else {
        // Non-vertical: vertical → horizontal → 45° diagonal into target
        const goingDown = fromPos.y < toPos.y;
        const dx = toPos.x - fromPos.x; // signed horizontal distance
        const diagDx = Math.sign(dx) * DIAG_LEN;
        const diagDy = goingDown ? DIAG_LEN : -DIAG_LEN;
        // Diagonal start point (where horizontal segment ends)
        const diagStartX = toPos.x - diagDx;
        const diagStartY = toPos.y - diagDy;
        // Fold Y = same as diagonal start Y, offset by index to avoid overlap
        const foldY = diagStartY + (goingDown ? -1 : 1) * i * channelSpacing;
        points = [
          fromPos,
          { x: fromPos.x, y: foldY },
          { x: diagStartX, y: foldY },
          toPos,
        ];
      }

      const clean = simplifyPath(points);
      const path = clean.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const midPt = clean[Math.floor(clean.length / 2)];
      routed.push({ wire, path, labelX: midPt.x + 8, labelY: midPt.y - 4 });
    });
  }

  // Route convergence groups (shared fromPos)
  for (const [, group] of convergeByFrom) {
    if (group.length < 2) continue;
    const remaining = group.filter(item => !handledWires.has(item.wire.id));
    if (remaining.length < 2) continue;

    remaining.sort((a, b) => Math.abs(a.toPos.x - a.fromPos.x) - Math.abs(b.toPos.x - b.fromPos.x));

    const DIAG_LEN = 10;
    remaining.forEach((item, i) => {
      const { wire, fromPos, toPos } = item;
      handledWires.add(wire.id);

      let points: { x: number; y: number }[];
      if (Math.abs(fromPos.x - toPos.x) < EPS) {
        points = [fromPos, toPos];
      } else {
        // 45° diagonal out of source → horizontal → vertical to target
        const goingDown = fromPos.y < toPos.y;
        const dx = toPos.x - fromPos.x;
        const diagDx = Math.sign(dx) * DIAG_LEN;
        const diagDy = goingDown ? DIAG_LEN : -DIAG_LEN;
        const diagEndX = fromPos.x + diagDx;
        const diagEndY = fromPos.y + diagDy;
        const foldY = diagEndY + (goingDown ? 1 : -1) * i * channelSpacing;
        points = [
          fromPos,
          { x: diagEndX, y: foldY },
          { x: toPos.x, y: foldY },
          toPos,
        ];
      }

      const clean = simplifyPath(points);
      const path = clean.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const midPt = clean[Math.floor(clean.length / 2)];
      routed.push({ wire, path, labelX: midPt.x + 8, labelY: midPt.y - 4 });
    });
  }

  // Route remaining non-convergence wires (original logic)
  const remainingChannel = needsChannel.filter(item => !handledWires.has(item.wire.id));
  remainingChannel.sort((a, b) => a.midY - b.midY || a.fromPos.x - b.fromPos.x);

  const grouped = new Map<number, typeof remainingChannel>();
  for (const item of remainingChannel) {
    const key = Math.round(item.midY / 10) * 10;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  for (const [, group] of grouped) {
    group.forEach((item, i) => {
      const { wire, fromPos, toPos } = item;
      let points: { x: number; y: number }[];

      if (group.length === 1) {
        const midY = (fromPos.y + toPos.y) / 2;
        points = [
          fromPos,
          { x: fromPos.x, y: midY },
          { x: toPos.x, y: midY },
          toPos,
        ];
      } else {
        const realMidY = (fromPos.y + toPos.y) / 2;
        const totalWidth = (group.length - 1) * channelSpacing;
        const startOff = -totalWidth / 2;
        let channelY = realMidY + startOff + i * channelSpacing;

        if (Math.abs(channelY - fromPos.y) < Math.abs(channelY - toPos.y)) {
          if (Math.abs(channelY - fromPos.y) < 30) channelY = fromPos.y;
        } else {
          if (Math.abs(channelY - toPos.y) < 30) channelY = toPos.y;
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
      routed.push({ wire, path, labelX: midPt.x + 8, labelY: midPt.y - 4 });
    });
  }

  return routed;
}
