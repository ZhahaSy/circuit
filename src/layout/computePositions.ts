import type { CircuitData, CircuitNode, ComponentType, LayerConfig, NodePosition, Wire } from '../types';
import { DEFAULT_LAYERS } from './defaultLayers';

export const LAYOUT = {
  width: 1400,
  height: 1000,
  marginLeft: 60,
  marginRight: 60,
  topMargin: 60,
  bottomMargin: 40,
};

export function computeLayerYPositions(layers: LayerConfig[]): Map<string, number> {
  const result = new Map<string, number>();
  const count = layers.length;
  if (count === 0) return result;

  const available = LAYOUT.height - LAYOUT.topMargin - LAYOUT.bottomMargin;
  if (count === 1) {
    result.set(layers[0].id, LAYOUT.topMargin + available / 2);
    return result;
  }

  const spacing = available / (count - 1);
  layers.forEach((layer, i) => {
    result.set(layer.id, LAYOUT.topMargin + spacing * i);
  });

  return result;
}

/**
 * Build adjacency: for each node, collect IDs of connected nodes in other layers.
 */
function buildAdjacency(wires: Wire[], nodeLayerMap: Map<string, number>): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const wire of wires) {
    const a = wire.from.nodeId;
    const b = wire.to.nodeId;
    const layerA = nodeLayerMap.get(a);
    const layerB = nodeLayerMap.get(b);
    if (layerA === undefined || layerB === undefined) continue;
    // Only consider cross-layer connections for barycenter
    if (layerA !== layerB) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
  }
  return adj;
}

/**
 * Assign X positions to a list of nodes evenly across the available width.
 */
function assignX(nodes: CircuitNode[], positions: Map<string, NodePosition>, y: number) {
  const usable = LAYOUT.width - LAYOUT.marginLeft - LAYOUT.marginRight;
  const spacing = usable / (nodes.length + 1);
  nodes.forEach((node, i) => {
    positions.set(node.id, { x: LAYOUT.marginLeft + spacing * (i + 1), y });
  });
}

/**
 * Barycenter heuristic: sort nodes within a layer by the average X of their
 * cross-layer neighbors. Iterate multiple passes (top-down then bottom-up)
 * to propagate ordering information across layers.
 */
function optimizeOrder(
  layerBuckets: { y: number; nodes: CircuitNode[] }[],
  adj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
) {
  const MAX_ITER = 4;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Top-down pass
    for (const bucket of layerBuckets) {
      sortByBarycenter(bucket.nodes, adj, positions);
      assignX(bucket.nodes, positions, bucket.y);
    }
    // Bottom-up pass
    for (let i = layerBuckets.length - 1; i >= 0; i--) {
      const bucket = layerBuckets[i];
      sortByBarycenter(bucket.nodes, adj, positions);
      assignX(bucket.nodes, positions, bucket.y);
    }
  }
}

function sortByBarycenter(
  nodes: CircuitNode[],
  adj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
) {
  nodes.sort((a, b) => {
    const ba = barycenter(a.id, adj, positions);
    const bb = barycenter(b.id, adj, positions);
    return ba - bb;
  });
}

function barycenter(
  nodeId: string,
  adj: Map<string, string[]>,
  positions: Map<string, NodePosition>,
): number {
  const neighbors = adj.get(nodeId);
  if (!neighbors || neighbors.length === 0) {
    // No cross-layer connections: keep current X (stable sort)
    return positions.get(nodeId)?.x ?? 0;
  }
  let sum = 0;
  for (const nid of neighbors) {
    sum += positions.get(nid)?.x ?? 0;
  }
  return sum / neighbors.length;
}

export function computePositions(data: CircuitData, layers?: LayerConfig[]): Map<string, NodePosition> {
  const effectiveLayers = layers ?? data.layers ?? DEFAULT_LAYERS;
  const layerYMap = computeLayerYPositions(effectiveLayers);

  // Build type → Y lookup
  const typeToY = new Map<ComponentType, number>();
  for (const layer of effectiveLayers) {
    const y = layerYMap.get(layer.id)!;
    for (const t of layer.types) {
      typeToY.set(t, y);
    }
  }

  const fallbackY = effectiveLayers.length > 0
    ? layerYMap.get(effectiveLayers[effectiveLayers.length - 1].id)!
    : LAYOUT.height / 2;

  // Group nodes into layer buckets (preserving layer order)
  const bucketMap = new Map<number, CircuitNode[]>();
  const nodeLayerY = new Map<string, number>();

  for (const node of data.nodes) {
    const y = typeToY.get(node.type) ?? fallbackY;
    nodeLayerY.set(node.id, y);
    if (!bucketMap.has(y)) bucketMap.set(y, []);
    bucketMap.get(y)!.push(node);
  }

  // Build ordered bucket list (by Y ascending)
  const layerBuckets = Array.from(bucketMap.entries())
    .sort(([ya], [yb]) => ya - yb)
    .map(([y, nodes]) => ({ y, nodes }));

  // Initial placement: even spacing
  const positions = new Map<string, NodePosition>();
  for (const bucket of layerBuckets) {
    assignX(bucket.nodes, positions, bucket.y);
  }

  // Optimize with barycenter heuristic
  const adj = buildAdjacency(data.wires, nodeLayerY);
  optimizeOrder(layerBuckets, adj, positions);

  return positions;
}
