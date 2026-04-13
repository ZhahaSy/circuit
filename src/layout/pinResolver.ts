import type { CircuitNode, NodePosition, Wire } from '../types';

/**
 * Pin X 位置解析器 — 唯一的 pin 定位来源
 *
 * 输出: pinXMap (key: "nodeId:pin" → absolute X)
 *
 * 策略:
 * 1. connector_plug pin: 对齐到 peer（贯通线优先对齐下游）
 * 2. 其他 pin: 对齐到 peer 的中心或 peer 的已解析 pin
 * 3. 后处理: 同节点同侧 pin 强制最小间距，CAN pin 相邻
 * 4. 对端同步: 重分配后把对端 pin 也对齐过来
 */

const MIN_PIN_SPACING = 100;
const EPS = 0.5;

export interface PinResolveResult {
  /** key: "nodeId:pin" → absolute X */
  pinXMap: Map<string, number>;
  /** key: nodeId → pin info array for rendering */
  pinInfoMap: Map<string, PinInfo[]>;
  /** key: nodeId → new X position (for terminal nodes that should move to align with their pin) */
  positionOverrides: Map<string, number>;
}

export interface PinInfo {
  xOffset: number;       // relative to node center
  side: 'top' | 'bottom';
  label?: string;        // e.g. "IP25-3"
}

export function resolvePins(
  wires: Wire[],
  positions: Map<string, NodePosition>,
  nodeMap: Map<string, CircuitNode>,
): PinResolveResult {
  const pinXMap = new Map<string, number>();

  // ── Step 1: connector_plug pins ──
  const plugPinPeers = new Map<string, { peerX: number; side: 'top' | 'bottom' }[]>();
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const epNode = nodeMap.get(ep.nodeId);
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
  for (const [key, peers] of plugPinPeers) {
    const topPeers = peers.filter(p => p.side === 'top');
    const bottomPeers = peers.filter(p => p.side === 'bottom');
    if (topPeers.length > 0 && bottomPeers.length > 0) {
      pinXMap.set(key, bottomPeers[0].peerX);
    } else {
      pinXMap.set(key, peers[0].peerX);
    }
  }

  // ── Step 2: all other pins — align to peer center (or peer's resolved pin) ──
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const key = `${ep.nodeId}:${ep.pin}`;
      if (pinXMap.has(key)) continue;
      // If peer has a resolved pin, align to that
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

  // ── Step 3: per-node per-side re-spacing with min gap + CAN adjacent ──
  // Collect pin metadata
  interface PinMeta { pin: string; absX: number; peerY: number; isCan: boolean }
  const nodePinsMeta = new Map<string, PinMeta[]>();
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const absX = pinXMap.get(`${ep.nodeId}:${ep.pin}`);
      if (absX == null) continue;
      const peerCenter = positions.get(peer.nodeId);
      if (!peerCenter) continue;
      const peerNode = nodeMap.get(peer.nodeId);
      if (!nodePinsMeta.has(ep.nodeId)) nodePinsMeta.set(ep.nodeId, []);
      const existing = nodePinsMeta.get(ep.nodeId)!;
      if (!existing.some(p => p.pin === ep.pin)) {
        existing.push({ pin: ep.pin, absX, peerY: peerCenter.y, isCan: peerNode?.type === 'can' });
      }
    }
  }

  for (const [nodeId, pins] of nodePinsMeta) {
    const nodeCenter = positions.get(nodeId);
    if (!nodeCenter || pins.length < 2) continue;

    for (const side of ['top', 'bottom'] as const) {
      const sidePins = pins.filter(p =>
        side === 'top' ? p.peerY < nodeCenter.y : p.peerY >= nodeCenter.y
      );
      if (sidePins.length < 2) continue;

      // Sort: non-CAN first by absX, then CAN pins adjacent at the end
      sidePins.sort((a, b) => {
        if (a.isCan && !b.isCan) return 1;
        if (!a.isCan && b.isCan) return -1;
        return a.absX - b.absX;
      });

      const totalWidth = (sidePins.length - 1) * MIN_PIN_SPACING;
      const startX = nodeCenter.x - totalWidth / 2;
      for (let i = 0; i < sidePins.length; i++) {
        pinXMap.set(`${nodeId}:${sidePins[i].pin}`, startX + i * MIN_PIN_SPACING);
      }
    }
  }

  // ── Step 4: sync peer pins to match ──
  // After re-spacing, the peer end of each wire must align.
  // Process nodes with FEWER pins first, so nodes with MORE pins (stronger layout
  // constraints) overwrite last and become the anchor.
  const step4Wires = [...wires].sort((a, b) => {
    const aFromCount = nodePinsMeta.get(a.from.nodeId)?.length ?? 0;
    const aToCount = nodePinsMeta.get(a.to.nodeId)?.length ?? 0;
    const aMax = Math.max(aFromCount, aToCount);
    const bFromCount = nodePinsMeta.get(b.from.nodeId)?.length ?? 0;
    const bToCount = nodePinsMeta.get(b.to.nodeId)?.length ?? 0;
    const bMax = Math.max(bFromCount, bToCount);
    return aMax - bMax;
  });
  for (const wire of step4Wires) {
    // For each wire, the endpoint with MORE pins is the anchor
    const fromMeta = nodePinsMeta.get(wire.from.nodeId);
    const toMeta = nodePinsMeta.get(wire.to.nodeId);
    const fromCount = fromMeta?.length ?? 0;
    const toCount = toMeta?.length ?? 0;

    // Determine which end is the anchor (more pins = anchor)
    const pairs: [typeof wire.from, typeof wire.to][] = fromCount >= toCount
      ? [[wire.from, wire.to]]
      : [[wire.to, wire.from]];

    for (const [ep, peer] of pairs) {
      if (!ep.pin) continue;
      const epX = pinXMap.get(`${ep.nodeId}:${ep.pin}`);
      if (epX == null) continue;
      const epMeta = nodePinsMeta.get(ep.nodeId);
      if (!epMeta || epMeta.length < 2) continue;
      if (peer.pin) {
        pinXMap.set(`${peer.nodeId}:${peer.pin}`, epX);
      } else {
        pinXMap.set(`${peer.nodeId}:__wire_${wire.id}`, epX);
      }
    }
  }

  // ── Build pinInfoMap for rendering ──
  const pinInfoMap = new Map<string, PinInfo[]>();
  const seenPinKeys = new Set<string>();

  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      const pinKey = ep.pin ?? `__nopin_${peer.nodeId}`;
      const key = `${ep.nodeId}:${pinKey}`;
      if (seenPinKeys.has(key)) continue;
      seenPinKeys.add(key);

      const nodeCenter = positions.get(ep.nodeId);
      const peerCenter = positions.get(peer.nodeId);
      if (!nodeCenter || !peerCenter) continue;

      let xOffset: number;
      if (ep.pin) {
        const absX = pinXMap.get(`${ep.nodeId}:${ep.pin}`);
        xOffset = absX != null ? absX - nodeCenter.x : 0;
      } else {
        xOffset = 0;
      }

      const side: 'top' | 'bottom' = peerCenter.y < nodeCenter.y ? 'top' : 'bottom';
      const label = ep.pin ? `${ep.nodeId}-${ep.pin}` : undefined;

      if (!pinInfoMap.has(ep.nodeId)) pinInfoMap.set(ep.nodeId, []);
      pinInfoMap.get(ep.nodeId)!.push({ xOffset, side, label });
    }
  }

  // ── Step 5: compute position overrides ──
  const positionOverrides = new Map<string, number>();

  // Count wires per node
  const nodeWireCount = new Map<string, number>();
  for (const wire of wires) {
    nodeWireCount.set(wire.from.nodeId, (nodeWireCount.get(wire.from.nodeId) ?? 0) + 1);
    nodeWireCount.set(wire.to.nodeId, (nodeWireCount.get(wire.to.nodeId) ?? 0) + 1);
  }

  // 5a: Terminal nodes (single connection) align to their connected pin
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin || peer.pin) continue;
      const epX = pinXMap.get(`${ep.nodeId}:${ep.pin}`);
      if (epX == null) continue;
      const peerCenter = positions.get(peer.nodeId);
      if (!peerCenter) continue;
      if ((nodeWireCount.get(peer.nodeId) ?? 0) > 1) continue;
      if (Math.abs(peerCenter.x - epX) < EPS) continue;
      positionOverrides.set(peer.nodeId, epX);
    }
  }

  // 5b: Splice nodes align to their upstream peer (the one with smaller Y / closer to power)
  // This makes the upstream→splice segment a straight vertical line,
  // and the splice→downstream segment uses a fold to converge.
  for (const node of nodeMap.values()) {
    if (node.type !== 'splice') continue;
    const nodePos = positions.get(node.id);
    if (!nodePos) continue;
    // Find all peers of this splice
    const peers: { nodeId: string; y: number; x: number }[] = [];
    for (const wire of wires) {
      let peerId: string | null = null;
      if (wire.from.nodeId === node.id) peerId = wire.to.nodeId;
      if (wire.to.nodeId === node.id) peerId = wire.from.nodeId;
      if (!peerId) continue;
      const peerPos = positions.get(peerId);
      if (peerPos) peers.push({ nodeId: peerId, y: peerPos.y, x: peerPos.x });
    }
    if (peers.length < 2) continue;
    // Upstream = peer with smallest Y (closest to power at top)
    const upstream = peers.reduce((a, b) => a.y < b.y ? a : b);
    if (Math.abs(nodePos.x - upstream.x) < EPS) continue;
    positionOverrides.set(node.id, upstream.x);
  }

  return { pinXMap, pinInfoMap, positionOverrides };
}
