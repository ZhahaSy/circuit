import type { CircuitData } from './types';

// 参考汽车电路图：无线充电系统
export const wirelessChargingCircuit: CircuitData = {
  title: '无线充电系统电路图',
  systemName: 'Wireless Charging System',
  nodes: [
    // ═══ 电源母线层 ═══
    { id: 'B+30', type: 'power', label: 'B+30', sublabel: '常电' },
    { id: 'IG1', type: 'power', label: 'IG1', sublabel: '点火电源' },
    { id: 'IG2', type: 'power', label: 'IG2', sublabel: '点火电源2' },

    // ═══ 保险丝层（IPJB,A2 内） ═══
    { id: 'IF07', type: 'fuse', label: 'IF07', sublabel: '5A' },
    { id: 'IF29', type: 'fuse', label: 'IF29', sublabel: '7.5A' },

    { id: 'PRI-CAN', label: 'PRI-CAN', type: 'can' },

    // ═══ 对接插头层 ═══
    { id: 'ICIP1', type: 'connector_plug', label: 'ICIP1' },
    // { id: 'ICIP1_D27', type: 'connector_plug', label: 'ICIP1,D27', sublabel: '对接插头', pins: ['1', '6'] },
    // { id: 'IPBD1_D11', type: 'connector_plug', label: 'IPBD1,D11', sublabel: '对接插头' },

    // ═══ ECU/模块层 ═══
    { id: 'IP25', type: 'ecu', label: '无线充电模块' },
    { id: 'BD106', type: 'ecu', label: '车身控制器' },

    // // ═══ 接头/接点层 ═══
    { id: 'S75', type: 'splice', label: 'S75' },
    // { id: 'SB15', type: 'splice', label: 'SB15' },

    // // ═══ 被动元件 ═══
    // { id: 'BD106', type: 'resistor', label: 'BD106', sublabel: '无线充电模块' },

    // // ═══ 接地层 ═══
    { id: 'GI021', type: 'ground', label: 'GI021' },
  ],
  wires: [
    // ── 电源 → 保险丝 ──
    { id: 'w01', from: { nodeId: 'B+30' }, to: { nodeId: 'IF07' }, label: '常电→IF07' },
    { id: 'w02', from: { nodeId: 'IG1' }, to: { nodeId: 'IF29' }, label: 'IG1→IF29' },

    // ── 保险丝 → 对接插头 ──
    { id: 'w03', from: { nodeId: 'IF07' }, to: { nodeId: 'ICIP1', pin: '1' }, color: 'G/Y', gauge: 0.5 },
    { id: 'w04', from: { nodeId: 'IF29' }, to: { nodeId: 'S75' }, color: 'G/Y', gauge: 0.5 },
    { id: 'w05', from: { nodeId: 'S75' }, to: { nodeId: 'ICIP1', pin: '1' }, color: 'G/Y', gauge: 0.5 },

    // ── KL87 → ECU（继电器输出线） ──
    { id: 'w09', from: { nodeId: 'KL87' }, to: { nodeId: 'IP25' }, color: 'G', gauge: 0.85 },

    // // ── ECU → 对接插头（下游） ──
    // { id: 'w10', from: { nodeId: 'IP25' }, to: { nodeId: 'ICIP1_D27', pin: '1' }, color: 'G', gauge: 0.5 },
    // { id: 'w11', from: { nodeId: 'IP25' }, to: { nodeId: 'ICIP1_D27', pin: '6' }, color: 'G', gauge: 0.5 },
    // { id: 'w12', from: { nodeId: 'IP25' }, to: { nodeId: 'IPBD1_D11' }, color: 'Br', gauge: 0.5 },

    // // ── 对接插头 → 无线充电模块 ──
    { id: 'w13', from: { nodeId: 'ICIP1', pin: '1' }, to: { nodeId: 'IP25', pin: '1' }, color: 'G/Y', gauge: 0.5 },
    // { id: 'w14', from: { nodeId: 'ICIP1', pin: '6' }, to: { nodeId: 'IP25', pin: '6' }, color: 'G', gauge: 0.5 },

    // // ── SB15 接点 ──
    // { id: 'w15', from: { nodeId: 'BD106' }, to: { nodeId: 'SB15' }, color: 'Br', gauge: 0.5 },

    { id: 'w17', from: { nodeId: 'IP25', pin: '3' }, to: { nodeId: 'GI021' }, color: 'Br', gauge: 0.5 },
    { id: 'w18', from: { nodeId: 'IP25', pin: '4' }, to: { nodeId: 'PRI-CAN', pin: '0' }, color: 'G', gauge: 0.5 },
    { id: 'w19', from: { nodeId: 'IP25', pin: '5' }, to: { nodeId: 'PRI-CAN', pin: '1' }, color: 'G/W', gauge: 0.5 },
    { id: 'w20', from: { nodeId: 'IP25', pin: '6' }, to: { nodeId: 'BD106', pin: '1' }, color: 'W', gauge: 0.5 },
  ],
  fuseBoxes: [
    { id: 'IPJB_A2', label: '仪表电器盒', children: ['IF07', 'IF29'] },
  ],
};
