import type { CircuitData } from './types';

// 参考汽车电路图：前照灯系统
export const sampleCircuit: CircuitData = {
  title: '前照灯系统电路图',
  systemName: 'Headlamp System',
  nodes: [
    // 电源层
    { id: 'BAT', type: 'power', label: '蓄电池', sublabel: 'B+' },
    { id: 'IG1', type: 'power', label: 'IG1', sublabel: '点火电源' },
    { id: 'ACC', type: 'power', label: 'ACC', sublabel: '附件电源' },

    // 保险丝层
    { id: 'F01', type: 'fuse', label: 'F01', sublabel: '30A' },
    { id: 'F02', type: 'fuse', label: 'F02', sublabel: '15A' },
    { id: 'F03', type: 'fuse', label: 'F03', sublabel: '10A' },
    { id: 'F04', type: 'fuse', label: 'F04', sublabel: '10A' },

    // 继电器层
    { id: 'RY01', type: 'relay', label: 'RY01', sublabel: '前照灯继电器' },
    { id: 'RY02', type: 'relay', label: 'RY02', sublabel: '远光继电器' },

    // 开关层
    { id: 'SW01', type: 'switch', label: 'SW01', sublabel: '灯光组合开关' },
    { id: 'SW02', type: 'switch', label: 'SW02', sublabel: '远光切换' },

    // 接头层
    { id: 'SP01', type: 'splice', label: 'SP01' },
    { id: 'SP02', type: 'splice', label: 'SP02' },
    { id: 'SP03', type: 'splice', label: 'SP03' },

    // 连接器层
    { id: 'C01', type: 'connector', label: 'C01', sublabel: '左前照灯', pins: ['1', '2', '3'] },
    { id: 'C02', type: 'connector', label: 'C02', sublabel: '右前照灯', pins: ['1', '2', '3'] },
    { id: 'C03', type: 'connector', label: 'C03', sublabel: '仪表板连接器', pins: ['1', '2', '3', '4'] },
    { id: 'C04', type: 'connector', label: 'C04', sublabel: '车身控制器', pins: ['1', '2', '3', '4', '5'] },

    // 对接插头层
    { id: 'CP01', type: 'connector_plug', label: 'CP01', sublabel: '左灯对接插头', pins: ['1', '2'] },
    { id: 'CP02', type: 'connector_plug', label: 'CP02', sublabel: '右灯对接插头', pins: ['1', '2'] },

    // ECU层
    { id: 'BCM', type: 'ecu', label: 'BCM', sublabel: '车身控制模块' },
    { id: 'IPM', type: 'ecu', label: 'IPM', sublabel: '智能电源模块' },
    { id: 'METER', type: 'ecu', label: '组合仪表', sublabel: 'Meter ECU' },

    // 接地层
    { id: 'G101', type: 'ground', label: 'G101' },
    { id: 'G201', type: 'ground', label: 'G201' },
    { id: 'G301', type: 'ground', label: 'G301' },
  ],
  wires: [
    // 电源 → 保险丝
    { id: 'w01', from: { nodeId: 'BAT' }, to: { nodeId: 'F01' }, color: 'R', gauge: 2.0 },
    { id: 'w02', from: { nodeId: 'BAT' }, to: { nodeId: 'F02' }, color: 'R', gauge: 1.25 },
    { id: 'w03', from: { nodeId: 'IG1' }, to: { nodeId: 'F03' }, color: 'R', gauge: 0.85 },
    { id: 'w04', from: { nodeId: 'ACC' }, to: { nodeId: 'F04' }, color: 'R/W', gauge: 0.5 },

    // 保险丝 → 继电器
    { id: 'w05', from: { nodeId: 'F01' }, to: { nodeId: 'RY01' }, color: 'R', gauge: 2.0 },
    { id: 'w06', from: { nodeId: 'F02' }, to: { nodeId: 'RY02' }, color: 'R', gauge: 1.25 },

    // 保险丝 → 开关（控制线）
    { id: 'w07', from: { nodeId: 'F03' }, to: { nodeId: 'SW01' }, color: 'W/G', gauge: 0.5 },
    { id: 'w08', from: { nodeId: 'F04' }, to: { nodeId: 'SW02' }, color: 'Y', gauge: 0.5 },

    // 开关 → 继电器（控制线）
    { id: 'w09', from: { nodeId: 'SW01' }, to: { nodeId: 'RY01' }, color: 'W/G', gauge: 0.35 },
    { id: 'w10', from: { nodeId: 'SW02' }, to: { nodeId: 'RY02' }, color: 'Y', gauge: 0.35 },

    // 继电器 → 接头
    { id: 'w11', from: { nodeId: 'RY01' }, to: { nodeId: 'SP01' }, color: 'R', gauge: 2.0 },
    { id: 'w12', from: { nodeId: 'RY02' }, to: { nodeId: 'SP02' }, color: 'W', gauge: 1.25 },

    // 接头分支 → 连接器
    { id: 'w13', from: { nodeId: 'SP01' }, to: { nodeId: 'C01', pin: '1' }, color: 'R', gauge: 1.25 },
    { id: 'w14', from: { nodeId: 'SP01' }, to: { nodeId: 'C02', pin: '1' }, color: 'R', gauge: 1.25 },
    { id: 'w15', from: { nodeId: 'SP02' }, to: { nodeId: 'C01', pin: '2' }, color: 'W', gauge: 0.85 },
    { id: 'w16', from: { nodeId: 'SP02' }, to: { nodeId: 'C02', pin: '2' }, color: 'W', gauge: 0.85 },
    { id: 'w17', from: { nodeId: 'SP03' }, to: { nodeId: 'C03', pin: '1' }, color: 'Gr', gauge: 0.35 },
    { id: 'w18', from: { nodeId: 'SW01' }, to: { nodeId: 'SP03' }, color: 'Gr', gauge: 0.35 },

    // 连接器 → ECU
    { id: 'w19', from: { nodeId: 'C03', pin: '2' }, to: { nodeId: 'METER' }, color: 'G', gauge: 0.35 },
    { id: 'w20', from: { nodeId: 'C04', pin: '1' }, to: { nodeId: 'BCM' }, color: 'B', gauge: 0.5 },
    { id: 'w21', from: { nodeId: 'C04', pin: '2' }, to: { nodeId: 'IPM' }, color: 'W/G', gauge: 0.5 },
    { id: 'w22', from: { nodeId: 'C01', pin: '3' }, to: { nodeId: 'C04', pin: '3' }, color: 'Br', gauge: 0.35 },

    // ECU → 接地
    { id: 'w23', from: { nodeId: 'BCM' }, to: { nodeId: 'G101' }, color: 'Br', gauge: 0.5 },
    { id: 'w24', from: { nodeId: 'IPM' }, to: { nodeId: 'G201' }, color: 'Br', gauge: 0.5 },
    { id: 'w25', from: { nodeId: 'METER' }, to: { nodeId: 'G301' }, color: 'Br', gauge: 0.35 },
    { id: 'w26', from: { nodeId: 'C01', pin: '3' }, to: { nodeId: 'G101' }, color: 'Br', gauge: 0.85 },
    { id: 'w27', from: { nodeId: 'C02', pin: '3' }, to: { nodeId: 'G201' }, color: 'Br', gauge: 0.85 },

    // 连接器 → 对接插头
    { id: 'w28', from: { nodeId: 'C01', pin: '1' }, to: { nodeId: 'CP01', pin: '1' }, color: 'W/B', gauge: 0.85 },
    { id: 'w29', from: { nodeId: 'C02', pin: '1' }, to: { nodeId: 'CP02', pin: '1' }, color: 'R/G', gauge: 0.85 },
  ],
};
