// 电路图数据模型

export type ComponentType =
  | 'power'           // 常电 ▽
  | 'ground'          // 接地 ⏚
  | 'fuse'            // 保险丝
  | 'connector'       // 连接器
  | 'connector_plug'  // 对接插头
  | 'splice'          // 接头
  | 'ecu'             // ECU/模块接口
  | 'switch'          // 开关
  | 'relay';          // 继电器

export interface CircuitNode {
  id: string;
  type: ComponentType;
  label: string;
  sublabel?: string;    // 副标签，如 "10A", "全景天窗"
  pins?: string[];      // 引脚列表
  customSvg?: string;   // 自定义 SVG data URL
}

export interface Wire {
  id: string;
  from: { nodeId: string; pin?: string };
  to: { nodeId: string; pin?: string };
  color: string;        // 线色 "R", "W/G", "Br"
  gauge: number;        // 线径 mm²
  label?: string;       // 额外标注
}

export interface LayerConfig {
  id: string;
  label: string;
  types: ComponentType[];
}

export interface CircuitData {
  title: string;
  systemName: string;
  nodes: CircuitNode[];
  wires: Wire[];
  layers?: LayerConfig[];
}

// --- 样式系统 ---

export interface NodeStyleConfig {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textColor?: string;
  fontSize?: number;
}

export interface WireStyleConfig {
  color?: string;
  strokeWidth?: number;
  dashArray?: string;
  opacity?: number;
}

export interface StyleConfig {
  /** 全局默认节点样式 */
  defaultNode?: NodeStyleConfig;
  /** 按组件类型的默认样式 */
  nodeByType?: Partial<Record<ComponentType, NodeStyleConfig>>;
  /** 按节点 ID 覆盖 */
  nodeById?: Record<string, NodeStyleConfig>;
  /** 全局默认线路样式 */
  defaultWire?: WireStyleConfig;
  /** 按线路 ID 覆盖 */
  wireById?: Record<string, WireStyleConfig>;
}

// --- 位置 ---

export interface NodePosition {
  x: number;
  y: number;
}
