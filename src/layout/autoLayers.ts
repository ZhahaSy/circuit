import type { CircuitData, ComponentType, LayerConfig } from '../types';

/**
 * 基于拓扑距离的自动分层
 *
 * 策略：
 * 1. 电源固定最顶层，接地固定最底层
 * 2. 其余节点按 BFS 拓扑距离（从电源出发）分配层级
 * 3. 同一拓扑距离的节点在同一层
 *
 * 返回的 LayerConfig 包含 nodeIds，精确指定每层的节点，
 * 不再依赖 types 做匹配（同类型元件可以出现在不同层）。
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

  // Assign each node a topological depth
  const nodeDepth = new Map<string, number>();

  for (const node of nodes) {
    if (node.type === 'power') {
      nodeDepth.set(node.id, 0);
    } else if (node.type === 'ground') {
      nodeDepth.set(node.id, Infinity);
    } else {
      const dp = distFromPower.get(node.id) ?? Infinity;
      nodeDepth.set(node.id, dp === Infinity ? 999 : dp);
    }
  }

  // Normalize ground depth = max non-ground depth + 1
  let maxDepth = 0;
  for (const [, d] of nodeDepth) {
    if (d !== Infinity && d !== 999 && d > maxDepth) maxDepth = d;
  }
  const groundDepth = maxDepth + 1;
  for (const node of nodes) {
    if (node.type === 'ground') nodeDepth.set(node.id, groundDepth);
    if (nodeDepth.get(node.id) === 999) nodeDepth.set(node.id, groundDepth - 1);
  }

  // Group nodes by depth
  const depthGroups = new Map<number, { ids: string[]; types: Set<ComponentType> }>();
  for (const node of nodes) {
    const d = nodeDepth.get(node.id) ?? 0;
    if (!depthGroups.has(d)) {
      depthGroups.set(d, { ids: [], types: new Set() });
    }
    const g = depthGroups.get(d)!;
    g.ids.push(node.id);
    g.types.add(node.type);
  }

  // Sort depths and build layer configs
  const sortedDepths = [...depthGroups.keys()].sort((a, b) => a - b);

  const LABEL_MAP: Partial<Record<ComponentType, string>> = {
    power: '电源', ground: '接地', fuse: '保险丝', relay: '继电器',
    switch: '开关', splice: '接点', connector: '连接器',
    connector_plug: '对接插头', ecu: 'ECU', ic: '集成电路',
    sensor: '传感器', actuator: '执行器', resistor: '电阻/模块',
    capacitor: '电容', diode: '二极管', transistor: '三极管',
  };

  const layers: LayerConfig[] = [];
  for (let i = 0; i < sortedDepths.length; i++) {
    const depth = sortedDepths[i];
    const group = depthGroups.get(depth)!;
    const types = [...group.types];
    const labels = types.map(t => LABEL_MAP[t] || t);
    layers.push({
      id: `topo_${depth}`,
      label: labels.join('/'),
      types,
      nodeIds: group.ids,
    });

    // 在保险丝/继电器层、ECU/模块层后插入线束层
    if (i < sortedDepths.length - 1) {
      const needsHarness = types.includes('fuse') || types.includes('relay')
        || types.includes('ecu') || types.includes('ic');
      if (needsHarness) {
        layers.push({
          id: `harness_${depth}`,
          label: '线束',
          types: [],
          nodeIds: [],
        });
      }
    }
  }

  return layers;
}
