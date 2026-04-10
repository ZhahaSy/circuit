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
  // After re-spacing, the peer end of each wire must align
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const epX = pinXMap.get(`${ep.nodeId}:${ep.pin}`);
      if (epX == null) continue;
      // Only sync if ep was re-spaced (has multiple pins on same side)
      const epMeta = nodePinsMeta.get(ep.nodeId);
      if (!epMeta || epMeta.length < 2) continue;
      if (peer.pin) {
        // Peer has a pin — align it
        pinXMap.set(`${peer.nodeId}:${peer.pin}`, epX);
      } else {
        // Peer has no pin (e.g. ground) — create a virtual entry so wireRouter aligns
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

  // ── Step 5: compute position overrides for terminal nodes ──
  // Terminal nodes (ground, can, etc.) with no pin that connect to a re-spaced pin
  // should move their center X to align with the wire endpoint
  const positionOverrides = new Map<string, number>();
  for (const wire of wires) {
    for (const [ep, peer] of [[wire.from, wire.to], [wire.to, wire.from]] as const) {
      if (!ep.pin) continue;
      const epX = pinXMap.get(`${ep.nodeId}:${ep.pin}`);
      if (epX == null) continue;
      const epMeta = nodePinsMeta.get(ep.nodeId);
      if (!epMeta || epMeta.length < 2) continue;
      if (!peer.pin) {
        // Terminal node with no pin — move it to align
        positionOverrides.set(peer.nodeId, epX);
      }
    }
  }

  return { pinXMap, pinInfoMap, positionOverrides };
}
