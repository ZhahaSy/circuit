import type { CircuitData, CircuitNode, ComponentType, LayerConfig, LayoutRuleConfig, NodePosition, Wire } from '../types';
import { DEFAULT_LAYERS } from './defaultLayers';
import { autoLayers } from './autoLayers';

export const LAYOUT = {
  width: 1400,
  height: 1000,
  marginLeft: 60,
  marginRight: 60,
  topMargin: 60,
  bottomMargin: 40,
};

/** Power bus info for rendering */
export interface PowerBusInfo {
  id: string;
  label: string;
  y: number;  // Y coordinate of this bus line
}

/** Result of position computation */
export interface LayoutResult {
  positions: Map<string, NodePosition>;
  powerBuses: PowerBusInfo[];
  busBarTopY: number;
}

const BUS_LINE_SPACING = 16;

export function computeLayerYPositions(
  layers: LayerConfig[],
  layoutRules?: LayoutRuleConfig,
): Map<string, number> {
  const result = new Map<string, number>();
  const count = layers.length;
  if (count === 0) return result;

  const available = LAYOUT.height - LAYOUT.topMargin - LAYOUT.bottomMargin;

  if (count === 1) {
    result.set(layers[0].id, LAYOUT.topMargin + available / 2);
    return result;
  }

  const templateSpacing = layoutRules?.layerSpacing;
  if (templateSpacing && templateSpacing * (count - 1) <= available) {
    const totalUsed = templateSpacing * (count - 1);
    const startY = LAYOUT.topMargin + (available - totalUsed) / 2;
    layers.forEach((layer, i) => {
      result.set(layer.id, startY + templateSpacing * i);
    });
  } else {
    const spacing = available / (count - 1);
    layers.forEach((layer, i) => {
      result.set(layer.id, LAYOUT.topMargin + spacing * i);
    });
  }

  return result;
}

// ── Adjacency helpers ──

/** Cross-layer adjacency (for barycenter: only neighbors in different layers) */
function buildCrossLayerAdj(wires: Wire[], nodeLayerY: Map<string, number>): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const wire of wires) {
    const a = wire.from.nodeId;
    const b = wire.to.nodeId;
    const layerA = nodeLayerY.get(a);
    const layerB = nodeLayerY.get(b);
    if (layerA === undefined || layerB === undefined) continue;
    if (layerA !== layerB) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
  }
  return adj;
}

/** Full adjacency (for adjacency sort: all neighbors regardless of layer) */
function buildFullAdj(wires: Wire[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const wire of wires) {
    const a = wire.from.nodeId;
    const b = wire.to.nodeId;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  return adj;
}

// ── Node bounding box half-widths (for overlap detection) ──

const NODE_HALF_WIDTHS: Partial<Record<ComponentType, number>> = {
  power: 12, ground: 14, fuse: 16, relay: 30, switch: 16,
  splice: 12, connector: 22, connector_plug: 16, ecu: 52,
  sensor: 24, actuator: 24, resistor: 20, capacitor: 16,
  diode: 16, transistor: 16, ic: 32, can: 12,
};

/** Minimum gap between node bounding boxes */
const MIN_NODE_GAP = 20;

// ── X assignment ──

function assignX(
  nodes: CircuitNode[],
  positions: Map<string, NodePosition>,
  y: number,
  nodeSpacing?: number,
  inlineGap?: number,
) {
  const usable = LAYOUT.width - LAYOUT.marginLeft - LAYOUT.marginRight;

  if (nodeSpacing && nodes.length > 1) {
    const effectiveSpacing = inlineGap ? Math.max(nodeSpacing, inlineGap) : nodeSpacing;
    const totalWidth = effectiveSpacing * (nodes.length - 1);
    const startX = LAYOUT.marginLeft + (usable - totalWidth) / 2;
    nodes.forEach((node, i) => {
      positions.set(node.id, { x: startX + effectiveSpacing * i, y });
    });
  } else {
    const spacing = usable / (nodes.length + 1);
    const effectiveSpacing = inlineGap ? Math.max(spacing, inlineGap) : spacing;
    nodes.forEach((node, i) => {
      positions.set(node.id, { x: LAYOUT.marginLeft + effectiveSpacing * (i + 1), y });
    });
  }

  // Post-pass: resolve node overlaps within this layer
  resolveNodeOverlaps(nodes, positions, y);
}

/** Push overlapping nodes apart so their bounding boxes don't intersect */
function resolveNodeOverlaps(
  nodes: CircuitNode[],
  positions: Map<string, NodePosition>,
  y: number,
) {
  if (nodes.length < 2) return;

  // Sort by current X
  const sorted = [...nodes].sort((a, b) => {
    const pa = positions.get(a.id)!;
    const pb = positions.get(b.id)!;
    return pa.x - pb.x;
  });

  // Push right if overlapping
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const prevPos = positions.get(prev.id)!;
    const curPos = positions.get(cur.id)!;

    const prevHalfW = NODE_HALF_WIDTHS[prev.type] ?? 20;
    const curHalfW = NODE_HALF_WIDTHS[cur.type] ?? 20;
    const minDist = prevHalfW + curHalfW + MIN_NODE_GAP;

    if (curPos.x - prevPos.x < minDist) {
      positions.set(cur.id, { x: prevPos.x + minDist, y });
    }
  }

  // Re-center the group within the usable area
  const usable = LAYOUT.width - LAYOUT.marginLeft - LAYOUT.marginRight;
  const firstX = positions.get(sorted[0].id)!.x;
  const lastX = positions.get(sorted[sorted.length - 1].id)!.x;
  const groupWidth = lastX - firstX;
  const idealCenter = LAYOUT.marginLeft + usable / 2;
  const currentCenter = (firstX + lastX) / 2;
  const shift = idealCenter - currentCenter;

  // Only shift if the group fits within bounds
  if (firstX + shift >= LAYOUT.marginLeft && lastX + shift <= LAYOUT.width - LAYOUT.marginRight) {
    for (const node of sorted) {
      const pos = positions.get(node.id)!;
      positions.set(node.id, { x: pos.x + shift, y });
    }
  } else if (groupWidth > usable) {
    // Group is wider than available space — compress to fit
    const startX = LAYOUT.marginLeft + (NODE_HALF_WIDTHS[sorted[0].type] ?? 20);
    const endX = LAYOUT.width - LAYOUT.marginRight - (NODE_HALF_WIDTHS[sorted[sorted.length - 1].type] ?? 20);
    const step = (endX - startX) / (sorted.length - 1);
    sorted.forEach((node, i) => {
      positions.set(node.id, { x: startX + step * i, y });
    });
  }
}

// ── Sort strategies ──

/** Barycenter: sort by average X of cross-layer neighbors, iterate to converge */
function sortByBarycenter(
  nodes: CircuitNode[],
  adj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
) {
  nodes.sort((a, b) => {
    const ba = barycenterValue(a.id, adj, positions);
    const bb = barycenterValue(b.id, adj, positions);
    return ba - bb;
  });
}

function barycenterValue(
  nodeId: string,
  adj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
): number {
  const neighbors = adj.get(nodeId);
  if (!neighbors || neighbors.length === 0) {
    return positions.get(nodeId)?.x ?? 0;
  }
  let sum = 0;
  for (const nid of neighbors) {
    sum += positions.get(nid)?.x ?? 0;
  }
  return sum / neighbors.length;
}

/**
 * Adjacency sort: cluster connected nodes together.
 * Greedy approach — pick the node with the most already-placed neighbors,
 * place it next to its neighbor cluster. Reduces visual scatter of related nodes.
 */
function sortByAdjacency(
  nodes: CircuitNode[],
  fullAdj: Map<string, string[]>,
) {
  if (nodes.length <= 1) return;

  const nodeSet = new Set(nodes.map(n => n.id));
  const placed: CircuitNode[] = [];
  const remaining = new Set(nodes.map(n => n.id));

  // Start with the node that has the most connections within this layer
  let best = nodes[0];
  let bestScore = -1;
  for (const node of nodes) {
    const neighbors = fullAdj.get(node.id) ?? [];
    const score = neighbors.filter(n => nodeSet.has(n)).length;
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }
  placed.push(best);
  remaining.delete(best.id);

  // Greedily add the node most connected to already-placed nodes
  while (remaining.size > 0) {
    let nextBest: CircuitNode | null = null;
    let nextScore = -1;

    for (const node of nodes) {
      if (!remaining.has(node.id)) continue;
      const neighbors = fullAdj.get(node.id) ?? [];
      const score = neighbors.filter(n => !remaining.has(n) && nodeSet.has(n)).length;
      if (score > nextScore) {
        nextScore = score;
        nextBest = node;
      }
    }

    if (nextBest) {
      // Find best insertion position: minimize distance to connected placed nodes
      const neighbors = fullAdj.get(nextBest.id) ?? [];
      const connectedIndices = placed
        .map((n, i) => ({ i, connected: neighbors.includes(n.id) }))
        .filter(x => x.connected)
        .map(x => x.i);

      if (connectedIndices.length > 0) {
        // Insert near the median of connected neighbors
        const median = connectedIndices[Math.floor(connectedIndices.length / 2)];
        placed.splice(median + 1, 0, nextBest);
      } else {
        placed.push(nextBest);
      }
      remaining.delete(nextBest.id);
    }
  }

  // Mutate the original array in-place
  for (let i = 0; i < nodes.length; i++) {
    nodes[i] = placed[i];
  }
}

// ── Optimize order (strategy dispatch) ──

function optimizeBarycenter(
  layerBuckets: { y: number; nodes: CircuitNode[] }[],
  adj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
  iterations: number,
  nodeSpacing?: number,
  inlineGap?: number,
) {
  for (let iter = 0; iter < iterations; iter++) {
    for (const bucket of layerBuckets) {
      sortByBarycenter(bucket.nodes, adj, positions);
      assignX(bucket.nodes, positions, bucket.y, nodeSpacing, inlineGap);
    }
    for (let i = layerBuckets.length - 1; i >= 0; i--) {
      const bucket = layerBuckets[i];
      sortByBarycenter(bucket.nodes, adj, positions);
      assignX(bucket.nodes, positions, bucket.y, nodeSpacing, inlineGap);
    }
  }
}

function optimizeAdjacency(
  layerBuckets: { y: number; nodes: CircuitNode[] }[],
  fullAdj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
  nodeSpacing?: number,
  inlineGap?: number,
) {
  for (const bucket of layerBuckets) {
    sortByAdjacency(bucket.nodes, fullAdj);
    assignX(bucket.nodes, positions, bucket.y, nodeSpacing, inlineGap);
  }
}

// ── Main entry ──

export function computePositions(
  data: CircuitData,
  layers?: LayerConfig[],
  layoutRules?: LayoutRuleConfig,
): LayoutResult {
  const effectiveLayers = layoutRules?.layerMode === 'auto'
    ? autoLayers(data)
    : (layers ?? data.layers ?? DEFAULT_LAYERS);

  // Separate power nodes from the rest
  const powerNodes = data.nodes.filter(n => n.type === 'power');
  const nonPowerNodes = data.nodes.filter(n => n.type !== 'power');

  // Filter out power layer from layer configs for non-power layout
  const nonPowerLayers = effectiveLayers.filter(l => !l.types.includes('power'));

  // ── Power bus bar region ──
  const busBarTopY = LAYOUT.topMargin;
  const powerBuses: PowerBusInfo[] = powerNodes.map((node, i) => ({
    id: node.id,
    label: node.sublabel || node.label,
    y: busBarTopY + i * BUS_LINE_SPACING,
  }));
  const busBarHeight = powerNodes.length > 0
    ? (powerNodes.length - 1) * BUS_LINE_SPACING + 24  // 24 = padding
    : 0;

  // ── Non-power layer Y positions (shifted below bus bar) ──
  const nonPowerTopMargin = busBarHeight > 0 ? busBarTopY + busBarHeight + 60 : LAYOUT.topMargin;
  const layerYMap = computeLayerYPositionsWithOffset(nonPowerLayers, nonPowerTopMargin, layoutRules);

  // ── Build nodeId → Y mapping ──
  // If layers have nodeIds (topo mode), use those for precise assignment.
  // Otherwise fall back to type-based matching.
  const nodeIdToY = new Map<string, number>();
  for (const layer of nonPowerLayers) {
    const y = layerYMap.get(layer.id)!;
    if (layer.nodeIds) {
      for (const nid of layer.nodeIds) {
        nodeIdToY.set(nid, y);
      }
    }
  }

  const typeToY = new Map<ComponentType, number>();
  for (const layer of nonPowerLayers) {
    const y = layerYMap.get(layer.id)!;
    // Only set type→Y if no nodeIds (template mode)
    if (!layer.nodeIds) {
      for (const t of layer.types) {
        typeToY.set(t, y);
      }
    }
  }

  const fallbackY = nonPowerLayers.length > 0
    ? layerYMap.get(nonPowerLayers[nonPowerLayers.length - 1].id)!
    : LAYOUT.height / 2;

  // ── Bucket non-power nodes into layers ──
  const bucketMap = new Map<number, CircuitNode[]>();
  const nodeLayerY = new Map<string, number>();

  for (const node of nonPowerNodes) {
    const y = nodeIdToY.get(node.id) ?? typeToY.get(node.type) ?? fallbackY;
    nodeLayerY.set(node.id, y);
    if (!bucketMap.has(y)) bucketMap.set(y, []);
    bucketMap.get(y)!.push(node);
  }

  const layerBuckets = Array.from(bucketMap.entries())
    .sort(([ya], [yb]) => ya - yb)
    .map(([y, nodes]) => ({ y, nodes }));

  const positions = new Map<string, NodePosition>();
  const nodeSpacing = layoutRules?.nodeSpacing;
  const inlineGap = layoutRules?.inlineGap;

  // Initial X assignment for non-power nodes
  for (const bucket of layerBuckets) {
    assignX(bucket.nodes, positions, bucket.y, nodeSpacing, inlineGap);
  }

  const strategy = layoutRules?.sortStrategy ?? 'barycenter';

  if (strategy === 'barycenter') {
    const adj = buildCrossLayerAdj(data.wires, nodeLayerY);
    const iterations = layoutRules?.barycenterIterations ?? 4;
    optimizeBarycenter(layerBuckets, adj, positions, iterations, nodeSpacing, inlineGap);
  } else if (strategy === 'adjacency') {
    const fullAdj = buildFullAdj(data.wires);
    optimizeAdjacency(layerBuckets, fullAdj, positions, nodeSpacing, inlineGap);
  }
  // strategy === 'manual': keep data order

  // ── Assign power node positions on bus lines ──
  // Power node X = average X of its directly connected downstream nodes
  // This makes the connection point (dot on bus line) align vertically
  const powerBusMap = new Map(powerBuses.map(b => [b.id, b]));
  for (const pNode of powerNodes) {
    const bus = powerBusMap.get(pNode.id);
    if (!bus) continue;

    // Find downstream nodes connected to this power node
    const connectedXs: number[] = [];
    for (const wire of data.wires) {
      if (wire.from.nodeId === pNode.id) {
        const pos = positions.get(wire.to.nodeId);
        if (pos) connectedXs.push(pos.x);
      }
      if (wire.to.nodeId === pNode.id) {
        const pos = positions.get(wire.from.nodeId);
        if (pos) connectedXs.push(pos.x);
      }
    }

    const x = connectedXs.length > 0
      ? connectedXs.reduce((a, b) => a + b, 0) / connectedXs.length
      : LAYOUT.width / 2;

    positions.set(pNode.id, { x, y: bus.y });
    nodeLayerY.set(pNode.id, bus.y);
  }

  return { positions, powerBuses, busBarTopY };
}

/** Compute layer Y positions with a custom top offset */
function computeLayerYPositionsWithOffset(
  layers: LayerConfig[],
  topOffset: number,
  layoutRules?: LayoutRuleConfig,
): Map<string, number> {
  const result = new Map<string, number>();
  const count = layers.length;
  if (count === 0) return result;

  const available = LAYOUT.height - topOffset - LAYOUT.bottomMargin;

  if (count === 1) {
    result.set(layers[0].id, topOffset + available / 2);
    return result;
  }

  const templateSpacing = layoutRules?.layerSpacing;
  if (templateSpacing && templateSpacing * (count - 1) <= available) {
    const totalUsed = templateSpacing * (count - 1);
    const startY = topOffset + (available - totalUsed) / 2;
    layers.forEach((layer, i) => {
      result.set(layer.id, startY + templateSpacing * i);
    });
  } else {
    const spacing = available / (count - 1);
    layers.forEach((layer, i) => {
      result.set(layer.id, topOffset + spacing * i);
    });
  }

  return result;
}
