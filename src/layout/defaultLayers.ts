import type { LayerConfig } from '../types';

export const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'power', label: '电源', types: ['power'] },
  { id: 'fuse', label: '保险丝', types: ['fuse'] },
  { id: 'relay', label: '继电器', types: ['relay'] },
  { id: 'switch', label: '开关', types: ['switch'] },
  { id: 'splice', label: '接头', types: ['splice'] },
  { id: 'connector', label: '连接器', types: ['connector'] },
  { id: 'connector_plug', label: '对接插头', types: ['connector_plug'] },
  { id: 'ecu', label: 'ECU', types: ['ecu'] },
  { id: 'ground', label: '接地', types: ['ground'] },
];
