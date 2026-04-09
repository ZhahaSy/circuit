import type { LayerConfig } from '../types';

/**
 * 默认层级：控制器居中，上方电源/保护/控制，下方检测/执行/连接，接地最底
 */
export const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'power', label: '电源', types: ['power'] },
  { id: 'protection', label: '保护/控制', types: ['fuse', 'relay'] },
  { id: 'switch', label: '开关/接头', types: ['switch', 'splice'] },
  { id: 'ecu', label: '控制器', types: ['ecu', 'ic'] },
  { id: 'sensor_actuator', label: '检测/执行', types: ['sensor', 'actuator', 'resistor', 'capacitor', 'diode', 'transistor'] },
  { id: 'connector', label: '连接器', types: ['connector', 'connector_plug'] },
  { id: 'ground', label: '接地', types: ['ground'] },
];
