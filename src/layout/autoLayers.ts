import type { CircuitData, ComponentType, LayerConfig } from '../types';

/**
 * 固定层级优先级：type → 层序号（0=最顶，越大越靠下）
 * 电源最顶，接地最底，ECU 居中，其余根据拓扑距离分配
 */
const FIXED_LAYER: Partial<Record<ComponentType, number>> = {
  power: 0,
  ground: 6,
};

const UPPER_TYPES: Set<ComponentType> = new Set(['fuse', 'relay']);
const CONTROLLER_TYPES: Set<ComponentType> = new Set(['ecu', 'ic']);

/**
 * 根据电路数据自动推断层级，不依赖手动模板
 *
 * 策略：
 * 1. 电源固定最顶层，接地固定最底层
 * 2. ECU/IC 固定中间层
 * 3. 保险丝/继电器 在 ECU 上方（电器盒区域）
 * 4. 其余节点根据与 ECU 的拓扑距离分配：
 *    - 从电源侧到达的 → ECU 上方
 *    - 从接地侧到达的或无连接的 → ECU 下方
 */
export function autoLayers(data: CircuitData): LayerConfig[] {
  const { nodes, wires } = data;
  if (nodes.length === 0) return [];

  // Build undirected adjacency
  const adj = new Map<string, Set<string>>();
  for (const node of nodes) adj.set(node.id, new Set());
  for (const wire of wires) {
    adj.get(wire.from.nodeId)?.add(wire.to.nodeId);
    adj.get(wire.to.nodeId)?.add(wire.from.nodeId);
  }

  // BFS distance from a set of source nodes
  function bfsDistance(sources: string[]): Map<string, number> {
    const dist = new Map<string, number>();
    const queue = [...sources];
    for (const s of sources) dist.set(s, 0);
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const d = dist.get(cur)!;
      for (const nb of adj.get(cur) ?? []) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    return dist;
  }

  const powerIds = nodes.filter(n => n.type === 'power').map(n => n.id);
  const groundIds = nodes.filter(n => n.type === 'ground').map(n => n.id);

  const distFromPower = bfsDistance(powerIds);
  const distFromGround = bfsDistance(groundIds);

  // Assign each node to a logical layer index (0-6)
  // 0: power, 1: fuse/relay, 2: upper peripherals, 3: ECU, 4: lower peripherals, 5: connectors, 6: ground
  const nodeLayer = new Map<string, number>();

  for (const node of nodes) {
    if (FIXED_LAYER[node.type] !== undefined) {
      nodeLayer.set(node.id, FIXED_LAYER[node.type]!);
    } else if (CONTROLLER_TYPES.has(node.type)) {
      nodeLayer.set(node.id, 3);
    } else if (UPPER_TYPES.has(node.type)) {
      nodeLayer.set(node.id, 1);
    } else {
      // Determine side based on topology
      const dp = distFromPower.get(node.id) ?? Infinity;
      const dg = distFromGround.get(node.id) ?? Infinity;

      if (node.type === 'connector' || node.type === 'connector_plug') {
        nodeLayer.set(node.id, 5);
      } else if (node.type === 'switch' || node.type === 'splice') {
        // Switches/splices: place based on which side they're closer to
        nodeLayer.set(node.id, dp <= dg ? 2 : 4);
      } else {
        // Sensors, actuators, passives etc → below ECU
        nodeLayer.set(node.id, dp < dg ? 2 : 4);
      }
    }
  }

  // Build layer configs from actual assignments
  const layerDefs: { index: number; label: string }[] = [
    { index: 0, label: '电源' },
    { index: 1, label: '保护/控制' },
    { index: 2, label: '上层外围' },
    { index: 3, label: '控制器' },
    { index: 4, label: '下层外围' },
    { index: 5, label: '连接器' },
    { index: 6, label: '接地' },
  ];

  // Only include layers that have nodes
  const usedIndices = new Set(nodeLayer.values());
  const layers: LayerConfig[] = [];

  for (const def of layerDefs) {
    if (!usedIndices.has(def.index)) continue;
    const layerNodes = nodes.filter(n => nodeLayer.get(n.id) === def.index);
    const types = [...new Set(layerNodes.map(n => n.type))];
    layers.push({
      id: `auto_${def.index}`,
      label: def.label,
      types,
    });
  }

  return layers;
}
