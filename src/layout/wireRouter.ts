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
  can:            { top: -30, bottom: 30 },
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
): RoutedWire[] {
  const powerNodeIds = new Set<string>();
  if (nodeMap) {
    for (const [id, node] of nodeMap) {
      if (node.type === 'power') powerNodeIds.add(id);
    }
  }

  // Build pin X position map: pin X aligns directly to the peer node's X
  // For connector_plug: if a pin has peers on both sides (pass-through), align to
  // the downstream (bottom) peer so the through-line is straight; others fold in.
  const pinXMap = new Map<string, number>(); // key: "nodeId:pin" -> absolute X

  // First pass: collect all peers for each connector_plug pin, grouped by side
  const plugPinPeers = new Map<string, { peerX: number; side: 'top' | 'bottom' }[]>();
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const epNode = nodeMap?.get(ep.nodeId);
      if (epNode?.type !== 'connector_plug') continue;
      const key = `${ep.nodeId}:${ep.pin}`;
      const epCenter = positions.get(ep.nodeId);
      const peerCenter = positions.get(peer.nodeId);
      if (!epCenter || !peerCenter) continue;
      const side: 'top' | 'bottom' = peerCenter.y < epCenter.y ? 'top' : 'bottom';
      if (!plugPinPeers.has(key)) plugPinPeers.set(key, []);
      plugPinPeers.get(key)!.push({ peerX: peerCenter.x, side });
    }
  }
  // Resolve connector_plug pin X
  for (const [key, peers] of plugPinPeers) {
    const topPeers = peers.filter(p => p.side === 'top');
    const bottomPeers = peers.filter(p => p.side === 'bottom');
    if (topPeers.length > 0 && bottomPeers.length > 0) {
      // Pass-through pin: align to the downstream (bottom) peer for a straight through-line
      pinXMap.set(key, bottomPeers[0].peerX);
    } else {
      // Single-side: align to the only peer
      pinXMap.set(key, peers[0].peerX);
    }
  }

  // CAN bus pins: fixed offsets (pin 0 = CAN-H at -5, pin 1 = CAN-L at +5)
  const CAN_PIN_OFFSETS: Record<string, number> = { '0': -10, '1': 10 };
  for (const wire of wires) {
    for (const ep of [wire.from, wire.to]) {
      if (!ep.pin) continue;
      const epNode = nodeMap?.get(ep.nodeId);
      if (epNode?.type !== 'can') continue;
      const key = `${ep.nodeId}:${ep.pin}`;
      if (pinXMap.has(key)) continue;
      const center = positions.get(ep.nodeId);
      if (!center) continue;
      const offset = CAN_PIN_OFFSETS[ep.pin] ?? 0;
      pinXMap.set(key, center.x + offset);
    }
  }

  // Second pass: non-connector_plug pins — align to peer's resolved pin X if available
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const key = `${ep.nodeId}:${ep.pin}`;
      if (pinXMap.has(key)) continue;
      // If peer has a resolved pin position, align to that
      if (peer.pin) {
        const peerPinX = pinXMap.get(`${peer.nodeId}:${peer.pin}`);
        if (peerPinX != null) {
          pinXMap.set(key, peerPinX);
          continue;
        }
      }
      const peerCenter = positions.get(peer.nodeId);
      if (!peerCenter) continue;
      pinXMap.set(key, peerCenter.x);
    }
  }

  // Helper: get pin X offset from center
  function pinXOffset(nodeId: string, pin: string | undefined): number {
    if (!pin) return 0;
    const key = `${nodeId}:${pin}`;
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

      const pOffset = pinXOffset(otherNodeId, otherPin);
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

    const fromPinOffset = pinXOffset(wire.from.nodeId, wire.from.pin);
    const toPinOffset = pinXOffset(wire.to.nodeId, wire.to.pin);

    const fromPos = { x: fromCenter.x + fromPinOffset, y: fromPortY };
    const toPos = { x: toCenter.x + toPinOffset, y: toPortY };

    if (Math.abs(fromCenter.x - toCenter.x) < EPS) {
      // Vertical wire — group by X for offset
      const key = Math.round(fromCenter.x);
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
  for (const [, group] of convergeByTo) {
    if (group.length < 2) continue;
    // Sort by horizontal distance to convergence point — closest first
    group.sort((a, b) => Math.abs(a.fromPos.x - a.toPos.x) - Math.abs(b.fromPos.x - b.toPos.x));

    const CONVERGE_OFFSET = 15;
    group.forEach((item, i) => {
      const { wire, fromPos, toPos } = item;
      handledWires.add(wire.id);

      let points: { x: number; y: number }[];
      if (i === 0) {
        // Closest wire: straight vertical (pin X already aligned to this peer)
        points = [fromPos, toPos];
      } else {
        // Other wires: fold close to the convergence point
        const goingDown = fromPos.y < toPos.y;
        const foldY = goingDown
          ? toPos.y - CONVERGE_OFFSET - (i - 1) * channelSpacing
          : toPos.y + CONVERGE_OFFSET + (i - 1) * channelSpacing;
        points = [
          fromPos,
          { x: fromPos.x, y: foldY },
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

  // Route convergence groups (shared fromPos)
  for (const [, group] of convergeByFrom) {
    if (group.length < 2) continue;
    // Filter out already handled wires
    const remaining = group.filter(item => !handledWires.has(item.wire.id));
    if (remaining.length < 2) continue;

    remaining.sort((a, b) => Math.abs(a.toPos.x - a.fromPos.x) - Math.abs(b.toPos.x - b.fromPos.x));

    const CONVERGE_OFFSET = 15;
    remaining.forEach((item, i) => {
      const { wire, fromPos, toPos } = item;
      handledWires.add(wire.id);

      let points: { x: number; y: number }[];
      if (i === 0) {
        // Closest wire: straight vertical (pin X already aligned to this peer)
        points = [fromPos, toPos];
      } else {
        const goingDown = fromPos.y < toPos.y;
        const foldY = goingDown
          ? fromPos.y + CONVERGE_OFFSET + (i - 1) * channelSpacing
          : fromPos.y - CONVERGE_OFFSET - (i - 1) * channelSpacing;
        points = [
          fromPos,
          { x: fromPos.x, y: foldY },
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
