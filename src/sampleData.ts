import type { CircuitData } from './types';

// 参考汽车电路图：前照灯系统
export const sampleCircuit: CircuitData = {
  title: '前照灯系统电路图',
  systemName: 'Headlamp System',
  nodes: [
    // 电源层
    { id: 'BAT', type: 'power', label: '蓄电池', sublabel: 'B+' },
    { id: 'IG1', type: 'power', label: 'IG1', sublabel: '点火电源' },
    { id: 'IG2', type: 'power', label: 'IG2', sublabel: '点火电源2' },

    // 保险丝层
    { id: 'EF01', type: 'fuse', label: 'EF01', sublabel: '40A' },
    { id: 'EF13', type: 'fuse', label: 'EF13', sublabel: '30A' },
    { id: 'F38', type: 'fuse', label: 'F38', sublabel: '7.5A' },
    { id: 'F41', type: 'fuse', label: 'F41', sublabel: '10A' },
    { id: 'F42', type: 'fuse', label: 'F42', sublabel: '10A' },

    // 继电器层
    { id: 'RY01', type: 'relay', label: 'RY01', sublabel: '前照灯继电器' },

    // 开关层
    { id: 'SW01', type: 'switch', label: 'SW01', sublabel: '灯光组合开关' },
    { id: 'SW02', type: 'switch', label: 'SW02', sublabel: '远近光切换' },

    // 接头层
    { id: 'SP01', type: 'splice', label: 'SP01' },
    { id: 'SP02', type: 'splice', label: 'SP02' },

    // 连接器层
    { id: 'M60', type: 'connector', label: 'M60', sublabel: '左前照灯', pins: ['Lo', 'Hi', 'GND'] },
    { id: 'M61', type: 'connector', label: 'M61', sublabel: '右前照灯', pins: ['Lo', 'Hi', 'GND'] },
    { id: 'E18', type: 'connector_plug', label: 'E18', sublabel: 'BCM对接插头' },

    // 对接插头层
    { id: 'CP01', type: 'connector_plug', label: 'CP01', sublabel: '左灯对接插头', pins: ['1', '2'] },
    { id: 'CP02', type: 'connector_plug', label: 'CP02', sublabel: '右灯对接插头', pins: ['1', '2'] },

    // ECU层
    { id: 'BCM', type: 'ecu', label: 'BCM', sublabel: '车身控制模块' },

    // 接地层
    { id: 'G101', type: 'ground', label: 'G101' },
    { id: 'G201', type: 'ground', label: 'G201' },
  ],
  wires: [
    // 电源 → 保险丝
    { id: 'w01', from: { nodeId: 'BAT' }, to: { nodeId: 'EF01' }, color: 'R', gauge: 3.0 },
    { id: 'w02', from: { nodeId: 'BAT' }, to: { nodeId: 'EF13' }, color: 'R', gauge: 2.0 },
    { id: 'w03', from: { nodeId: 'IG1' }, to: { nodeId: 'F38' }, color: 'W/R', gauge: 0.85 },
    { id: 'w04', from: { nodeId: 'IG1' }, to: { nodeId: 'F41' }, color: 'W/R', gauge: 0.85 },
    { id: 'w05', from: { nodeId: 'IG2' }, to: { nodeId: 'F42' }, color: 'R/W', gauge: 0.85 },

    // 保险丝 → 继电器（主电源线）
    { id: 'w06', from: { nodeId: 'EF01' }, to: { nodeId: 'RY01' }, color: 'R', gauge: 3.0 },

    // 保险丝 → 开关（控制线）
    { id: 'w07', from: { nodeId: 'F38' }, to: { nodeId: 'SW01' }, color: 'W/G', gauge: 0.5 },
    { id: 'w08', from: { nodeId: 'F42' }, to: { nodeId: 'SW02' }, color: 'G/W', gauge: 0.5 },

    // 开关 → 继电器（控制线）
    { id: 'w09', from: { nodeId: 'SW01' }, to: { nodeId: 'RY01' }, color: 'W/G', gauge: 0.35 },

    // 继电器 → 接头（近光分配）
    { id: 'w10', from: { nodeId: 'RY01' }, to: { nodeId: 'SP01' }, color: 'R', gauge: 2.0 },

    // 远光线路：保险丝 → 开关 → 接头
    { id: 'w11', from: { nodeId: 'EF13' }, to: { nodeId: 'SW02' }, color: 'R', gauge: 1.25 },
    { id: 'w12', from: { nodeId: 'SW02' }, to: { nodeId: 'SP02' }, color: 'W', gauge: 1.25 },

    // 接头 → 左右前照灯（近光）
    { id: 'w13', from: { nodeId: 'SP01' }, to: { nodeId: 'M60', pin: 'Lo' }, color: 'R/Y', gauge: 1.25 },
    { id: 'w14', from: { nodeId: 'SP01' }, to: { nodeId: 'M61', pin: 'Lo' }, color: 'R/Y', gauge: 1.25 },

    // 接头 → 左右前照灯（远光）
    { id: 'w15', from: { nodeId: 'SP02' }, to: { nodeId: 'M60', pin: 'Hi' }, color: 'R/G', gauge: 0.85 },
    { id: 'w16', from: { nodeId: 'SP02' }, to: { nodeId: 'M61', pin: 'Hi' }, color: 'R/G', gauge: 0.85 },

    // 保险丝 → BCM对接插头
    { id: 'w17', from: { nodeId: 'F41' }, to: { nodeId: 'E18' }, color: 'W/R', gauge: 0.5 },

    // BCM对接插头 → BCM
    { id: 'w18', from: { nodeId: 'E18' }, to: { nodeId: 'BCM' }, color: 'B', gauge: 0.5 },

    // 灯光状态反馈线
    { id: 'w19', from: { nodeId: 'SW01' }, to: { nodeId: 'E18' }, color: 'Gr', gauge: 0.35 },

    // 接地线
    { id: 'w20', from: { nodeId: 'M60', pin: 'GND' }, to: { nodeId: 'G101' }, color: 'Br', gauge: 1.25 },
    { id: 'w21', from: { nodeId: 'M61', pin: 'GND' }, to: { nodeId: 'G201' }, color: 'Br', gauge: 1.25 },
    { id: 'w22', from: { nodeId: 'BCM' }, to: { nodeId: 'G101' }, color: 'Br', gauge: 0.5 },

    // 连接器 → 对接插头
    { id: 'w23', from: { nodeId: 'M60', pin: 'Lo' }, to: { nodeId: 'CP01', pin: '1' }, color: 'W/B', gauge: 0.85 },
    { id: 'w24', from: { nodeId: 'M60', pin: 'Hi' }, to: { nodeId: 'CP01', pin: '2' }, color: 'R/B', gauge: 0.85 },
    { id: 'w25', from: { nodeId: 'M61', pin: 'Lo' }, to: { nodeId: 'CP02', pin: '1' }, color: 'W/B', gauge: 0.85 },
    { id: 'w26', from: { nodeId: 'M61', pin: 'Hi' }, to: { nodeId: 'CP02', pin: '2' }, color: 'R/B', gauge: 0.85 },
  ],
  fuseBoxes: [
    { id: 'FB01', label: '发动机舱电器盒', children: ['EF01', 'EF13', 'RY01'] },
    { id: 'FB02', label: '驾驶舱电器盒', children: ['F38', 'F41', 'F42'] },
  ],
};
