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
  | 'relay'           // 继电器
  | 'sensor'          // 传感器
  | 'actuator'        // 执行器
  | 'resistor'        // 电阻
  | 'capacitor'       // 电容
  | 'diode'           // 二极管
  | 'transistor'      // 三极管
  | 'ic';             // 集成电路

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

export interface FuseBoxConfig {
  id: string;
  label: string;
  children: string[];   // 包含的元器件ID列表（保险丝/继电器）
}

export interface CircuitData {
  title: string;
  systemName: string;
  nodes: CircuitNode[];
  wires: Wire[];
  layers?: LayerConfig[];
  fuseBoxes?: FuseBoxConfig[];
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

// --- 规则配置模板 ---

export interface PowerPort {
  id: string;
  label: string;
  description?: string;
}

export interface ConnectionConstraint {
  fromType: ComponentType;
  toType: ComponentType;
  required: boolean;
  description?: string;
}

export interface ConnectionRuleConfig {
  fuseBoxContainedTypes: ComponentType[];
  groundPlacement: 'below_controller' | 'above_controller' | 'free';
  powerOutputPorts: PowerPort[];
  fuseBoxIndependentWiring: boolean;
  connectionConstraints: ConnectionConstraint[];
}

export interface WireRuleConfig {
  colorCodeMap: Record<string, string>;
  multiColorSeparator: string;
  primaryWidth: number;
  secondaryWidth: number;
  labelFormat: string;
  labelVisible: boolean;
}

export interface LayerTemplate {
  id: string;
  label: string;
  types: ComponentType[];
}

export interface LayoutRuleConfig {
  defaultDirection: 'vertical' | 'horizontal' | 'auto';
  verticalCondition: {
    requirePower: boolean;
    requireController: boolean;
    requireBalancedPins: boolean;
  };
  /** 'template' 使用手动层级模板, 'auto' 根据拓扑自动分层 */
  layerMode: 'template' | 'auto';
  layerTemplate: LayerTemplate[];
  layerSpacing: number;
  nodeSpacing: number;
  /** 同行元器件之间的最小间隙 (px) */
  inlineGap: number;
  sortStrategy: 'barycenter' | 'manual' | 'adjacency';
  barycenterIterations: number;
}

export interface PinRuleConfig {
  labelPosition: 'outside' | 'inside';
  labelFormat: string;
  showPinsInsideController: boolean;
  autoDetectDirection: boolean;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description?: string;
  manufacturer?: string;
  vehicleSeries?: string;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
  connectionRules: ConnectionRuleConfig;
  wireRules: WireRuleConfig;
  layoutRules: LayoutRuleConfig;
  pinRules: PinRuleConfig;
}
