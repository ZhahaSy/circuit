# 可配置化电路图生成器 PRD

## 1. 项目概述

### 1.1 项目背景

当前汽车售后手册的电路图开发流程依赖人工对照设计院图纸进行设计，效率低下且容易出错。期望基于电路回路表实现代码自动生成电路图，提升开发效率并保证一致性。

### 1.2 项目目标

构建一个**可配置化的电路图生成器**，通过声明式配置驱动的架构，支持灵活定义元器件类型、布局规则、渲染样式、线束规则等，生成符合汽车行业标准的电路图。

### 1.3 核心价值

| 价值点 | 说明 |
|--------|------|
| 配置驱动 | 通过 JSON/YAML 配置文件定义电路图结构，零代码生成电路图 |
| 布局自动化 | 内置多种布局算法，自动计算元器件位置和连线路径 |
| 样式可定制 | 支持为不同元器件、线束、针脚定义独立的渲染样式 |
| 导出多格式 | 支持 SVG、PDF、图片等多种导出格式 |
| 层级清晰 | 支持图层配置，控制元器件的垂直排列顺序 |

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      配置层 (Configuration)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 元器件配置    │  │  布局配置     │  │  样式配置     │      │
│  │ Component    │  │  Layout      │  │  Style        │      │
│  │ Config       │  │  Config      │  │  Config       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 线束规则配置  │  │  图层配置     │  │  导出配置     │      │
│  │ Wire         │  │  Layer       │  │  Export      │      │
│  │ Rules        │  │  Config      │  │  Config      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      核心引擎 (Core Engine)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 数据解析器    │  │  布局计算器   │  │  路径路由器   │      │
│  │ Data         │  │  Layout      │  │  Wire        │      │
│  │ Parser       │  │  Compute     │  │  Router      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ 样式管理器    │  │  渲染引擎    │                         │
│  │ Style        │  │  Render      │                         │
│  │ Manager      │  │  Engine      │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      输出层 (Output)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   SVG        │  │   PDF        │  │   Image       │      │
│  │   输出        │  │   导出       │  │   导出        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React 19 + TypeScript | 组件化架构，类型安全 |
| 构建工具 | Vite 8 | 快速开发体验 |
| 布局算法 | Dagre / Elkjs | 图布局计算 |
| SVG 渲染 | 原生 SVG / svg2pdf.js | 矢量图形输出 |
| PDF 导出 | jsPDF + svg2pdf.js | PDF 文件生成 |
| 样式管理 | Tailwind CSS / CSS-in-JS | 样式配置化 |

### 2.3 目录结构

```
src/
├── config/                    # 配置定义
│   ├── componentTypes.ts     # 元器件类型定义
│   ├── layoutRules.ts        # 布局规则配置
│   ├── wireRules.ts          # 线束规则配置
│   └── stylePresets.ts       # 样式预设配置
├── core/                     # 核心引擎
│   ├── CircuitParser.ts      # 数据解析器
│   ├── LayoutEngine.ts       # 布局计算引擎
│   ├── WireRouter.ts         # 线束路径路由
│   └── StyleResolver.ts      # 样式解析器
├── components/               # React 组件
│   ├── nodes/                # 元器件组件
│   │   ├── PowerNode.tsx
│   │   ├── GroundNode.tsx
│   │   ├── FuseNode.tsx
│   │   ├── RelayNode.tsx
│   │   ├── SwitchNode.tsx
│   │   ├── ConnectorNode.tsx
│   │   ├── EcuNode.tsx
│   │   └── ...
│   ├── wires/                # 线束组件
│   │   ├── SingleWire.tsx
│   │   └── MultiColorWire.tsx
│   └── CircuitCanvas.tsx     # 画布组件
├── hooks/                    # React Hooks
│   ├── useCircuitConfig.ts   # 配置管理
│   ├── useLayoutCompute.ts   # 布局计算
│   └── useCircuitExport.ts   # 导出功能
├── types/                    # 类型定义
│   └── index.ts
└── utils/                    # 工具函数
    ├── colorParser.ts        # 线束颜色解析
    └── geometry.ts           # 几何计算
```

---

## 3. 配置系统

### 3.1 元器件配置 (ComponentConfig)

定义电路图中使用的所有元器件类型和行为。

```typescript
interface ComponentConfig {
  type: string;                      // 元器件类型标识
  category: ComponentCategory;       // 分类：电源类、保护类、控制类等
  label: string;                      // 显示名称
  icon?: string;                      // SVG 图标路径
  customSvg?: string;                 // 自定义 SVG data URL
  defaultPins?: PinConfig[];         // 默认针脚配置
  renderDirection?: 'horizontal' | 'vertical';  // 渲染方向
  style?: NodeStyleConfig;            // 默认样式
  layoutRules?: LayoutRules;         // 布局规则
}

type ComponentCategory =
  | 'power'      // 电源类
  | 'ground'     // 接地类
  | 'protection' // 保护类（保险丝）
  | 'control'    // 控制类（开关、继电器）
  | 'detection'  // 检测类（传感器）
  | 'execution'  // 执行类（执行器）
  | 'passive'    // 被动元件（电阻、电容）
  | 'semiconductor' // 半导体（二极管、三极管）
  | 'chip'       // 芯片类（集成电路）
  | 'connection' // 连接类（连接器、线束）
  | 'special';   // 特殊类（电器盒、多入口电源）

interface PinConfig {
  id: string;           // 针脚标识
  label?: string;       // 针脚标签
  direction?: PinDirection;  // 方向：上、下、左、右
  wireRules?: WireAttachRule[];  // 线束连接规则
}

type PinDirection = 'top' | 'bottom' | 'left' | 'right';
```

### 3.2 内置元器件类型

#### 3.2.1 普通元器件

| 元器件类型 | Category | 说明 | 特殊配置 |
|-----------|----------|------|----------|
| 电源 (power) | power | 电路电力来源 | 多入口配置 |
| 接地 (ground) | ground | 电路回路接地点 | - |
| 保险丝 (fuse) | protection | 过流保护装置 | 额定电流 |
| 继电器 (relay) | control | 电路开关控制 | 线圈电压、触点配置 |
| 开关 (switch) | control | 手动控制通断 | 挡位配置 |
| 传感器 (sensor) | detection | 采集信号输入 | 信号类型 |
| 执行器 (actuator) | execution | 执行控制输出 | 工作电压 |
| 电阻 (resistor) | passive | 限流、分压 | 阻值 |
| 电容 (capacitor) | passive | 滤波、储能 | 容值 |
| 二极管 (diode) | semiconductor | 单向导通 | 正向压降 |
| 三极管 (transistor) | semiconductor | 放大、开关 | 类型(NPN/PNP) |
| 集成电路 (ic) | chip | 复杂功能处理 | 型号 |
| 连接器 (connector) | connection | 线束对接 | 针脚列表 |
| 线束 (wire_harness) | connection | 信号/电力传输 | 颜色、线径 |
| 连接点 (splice) | connection | 线束合并 | - |

#### 3.2.2 特殊元器件

| 元器件类型 | Category | 说明 | 特殊配置 |
|-----------|----------|------|----------|
| 电器盒 (junction_box) | special | 继电器与电器盒的载体 | 包含保险丝、继电器 |
| 多入口电源 (multi_power) | power | 提供 IG、ACC 等不同电路接点 | 入口列表 |
| CAN 线 (can_bus) | special | 控制器件信号通信 | 总线类型(S/C-CAN) |
| 省略式元气件 (omitted) | special | 纯文本展示 | 显示文本 |

### 3.3 布局配置 (LayoutConfig)

```typescript
interface LayoutConfig {
  direction: 'horizontal' | 'vertical';  // 整体布局方向
  width: number;                           // 画布宽度
  height: number;                          // 画布高度
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  layerSpacing: number;     // 图层间距
  nodeSpacing: number;      // 节点间距
  layers: LayerDefinition[];  // 图层定义
}

interface LayerDefinition {
  id: string;               // 图层标识
  label: string;            // 图层名称
  types: string[];          // 包含的元器件类型
  yPosition?: number;       // 固定 Y 坐标（垂直布局时）
  xPosition?: number;       // 固定 X 坐标（水平布局时）
}

interface LayoutRules {
  fixedPosition?: {         // 固定位置
    x?: number | 'start' | 'center' | 'end';
    y?: number | 'start' | 'center' | 'end';
  };
  alignWith?: string[];     // 与其他元器件对齐
  positionRelativeTo?: string;  // 相对于某个元器件定位
  zIndex?: number;          // 层级顺序
}
```

### 3.4 线束规则配置 (WireRules)

```typescript
interface WireRules {
  defaultColor: string;           // 默认线色
  defaultGauge: number;          // 默认线径 (mm²)
  colorConfig: WireColorConfig;   // 颜色配置
  gaugeConfig: WireGaugeConfig;  // 线径配置
  routingRules: RoutingRule[];    // 路由规则
}

interface WireColorConfig {
  singleColors: Record<string, string>;    // 单色映射：R→红色
  multiColorSeparator: string;             // 复色分隔符："/"
  primaryColorWidth: number;               // 主色宽度 (px)
  secondaryColorWidth: number;             // 次色宽度 (px)
}

interface WireGaugeConfig {
  gauge2Width: Record<number, number>;  // 线径到线宽的映射
  defaultWidth: number;
}

interface RoutingRule {
  from: string;     // 起始节点类型
  to: string;       // 目标节点类型
  pathType: 'straight' | 'orthogonal' | 'curved';  // 路径类型
  bendPoints?: { x: number; y: number }[];  // 拐点
}

interface Wire {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  color: string;         // 线色：R, W/G, Br
  gauge: number;         // 线径 mm²
  label?: string;        // 额外标注
  route?: string;        // 指定路由规则ID
}

interface WireEndpoint {
  nodeId: string;
  pin?: string;           // 针脚ID
  direction?: PinDirection;  // 连接方向
}
```

### 3.5 样式配置 (StyleConfig)

```typescript
interface StyleConfig {
  global: GlobalStyle;           // 全局样式
  nodeStyles: NodeStyleMap;      // 元器件样式
  wireStyles: WireStyleMap;      // 线束样式
  pinStyles: PinStyleMap;        // 针脚样式
  textStyles: TextStyleMap;      // 文本样式
}

interface GlobalStyle {
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize?: number;
  gridColor?: string;
}

interface NodeStyleMap {
  default: NodeStyleConfig;
  byType: Record<string, NodeStyleConfig>;
  byId: Record<string, NodeStyleConfig>;
}

interface NodeStyleConfig {
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  iconSize?: number;
  opacity?: number;
}

interface WireStyleMap {
  default: WireStyleConfig;
  byColor: Record<string, WireStyleConfig>;
  byId: Record<string, WireStyleConfig>;
}

interface WireStyleConfig {
  strokeWidth?: number;
  stroke?: string;
  dashArray?: string;
  opacity?: number;
  color?: string;
}

interface PinStyleMap {
  default: PinStyleConfig;
  byDirection: Record<PinDirection, PinStyleConfig>;
}

interface PinStyleConfig {
  size: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  labelOffset: number;
  labelFontSize: number;
}

interface TextStyleMap {
  nodeLabel: TextStyleConfig;
  nodeSublabel: TextStyleConfig;
  pinLabel: TextStyleConfig;
  wireLabel: TextStyleConfig;
}

interface TextStyleConfig {
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
}
```

### 3.6 样式预设 (StylePresets)

```typescript
interface StylePreset {
  id: string;
  name: string;
  description: string;
  config: StyleConfig;
}

// 预设示例
const PRESETS = {
  standard: {
    id: 'standard',
    name: '标准样式',
    description: '默认汽车电路图样式',
    config: {
      global: {
        backgroundColor: '#ffffff',
        gridEnabled: true,
        gridSize: 20,
        gridColor: '#e0e0e0',
      },
      nodeStyles: {
        default: {
          fill: '#f5f5f5',
          stroke: '#333333',
          strokeWidth: 1,
          textColor: '#333333',
          fontSize: 12,
        },
        byType: {
          power: { fill: '#ffcccc', stroke: '#cc0000' },
          ground: { fill: '#333333', textColor: '#ffffff' },
          fuse: { fill: '#ffe0b2', stroke: '#ff9800' },
          relay: { fill: '#e1f5fe', stroke: '#0288d1' },
        },
      },
      wireStyles: {
        default: { strokeWidth: 2 },
        byColor: {
          'R': { stroke: '#ff0000' },
          'W': { stroke: '#ffffff' },
          'W/G': { stroke: '#ffffff' },  // 主色
        },
      },
    },
  },
};
```

---

## 4. 数据模型

### 4.1 电路数据 (CircuitData)

```typescript
interface CircuitData {
  meta: CircuitMeta;           // 元信息
  nodes: CircuitNode[];         // 元器件列表
  wires: Wire[];                // 线束列表
  config?: CircuitConfig;       // 电路特定配置（覆盖全局配置）
}

interface CircuitMeta {
  title: string;               // 电路图标题
  systemName: string;          // 系统名称
  version?: string;            // 版本号
  author?: string;             // 作者
  createdAt?: string;          // 创建时间
  description?: string;        // 描述
  tags?: string[];             // 标签
}

interface CircuitNode {
  id: string;                  // 唯一标识
  type: string;                // 元器件类型
  label: string;               // 主标签
  sublabel?: string;           // 副标签（如额定值）
  pins?: string[];             // 针脚列表（简化配置）
  position?: Position;         // 位置（可选，不提供则自动计算）
  customSvg?: string;          // 自定义 SVG
  style?: NodeStyleConfig;     // 覆盖样式
  metadata?: Record<string, any>;  // 扩展数据
}

interface Position {
  x: number;
  y: number;
}
```

### 4.2 完整配置示例

```json
{
  "meta": {
    "title": "前照灯系统电路图",
    "systemName": "Headlamp System",
    "version": "1.0.0"
  },
  "nodes": [
    {
      "id": "BAT",
      "type": "power",
      "label": "蓄电池",
      "sublabel": "B+"
    },
    {
      "id": "EF01",
      "type": "fuse",
      "label": "EF01",
      "sublabel": "40A"
    },
    {
      "id": "RY01",
      "type": "relay",
      "label": "RY01",
      "sublabel": "前照灯继电器"
    },
    {
      "id": "BCM",
      "type": "ecu",
      "label": "BCM",
      "sublabel": "车身控制模块"
    },
    {
      "id": "G101",
      "type": "ground",
      "label": "G101"
    }
  ],
  "wires": [
    {
      "id": "w01",
      "from": { "nodeId": "BAT" },
      "to": { "nodeId": "EF01" },
      "color": "R",
      "gauge": 3.0
    },
    {
      "id": "w02",
      "from": { "nodeId": "EF01", "pin": "out" },
      "to": { "nodeId": "RY01", "pin": "coil" },
      "color": "R",
      "gauge": 2.0
    }
  ],
  "config": {
    "layout": {
      "direction": "vertical",
      "width": 1400,
      "height": 1000
    }
  }
}
```

---

## 5. 核心功能模块

### 5.1 数据解析器 (CircuitParser)

**职责**：解析外部配置和数据，转换为内部数据模型。

```typescript
class CircuitParser {
  parse(circuitJson: object): CircuitData;
  validate(data: CircuitData): ValidationResult;
  mergeConfig(data: CircuitData, config: Partial<CircuitConfig>): CircuitData;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
}
```

### 5.2 布局计算引擎 (LayoutEngine)

**职责**：根据元器件类型、连接关系和布局规则计算元器件位置。

```typescript
class LayoutEngine {
  compute(circuit: CircuitData, config: LayoutConfig): LayoutResult;
  computeAuto(circuit: CircuitData): LayoutResult;
  optimizeLayout(result: LayoutResult): LayoutResult;
}

interface LayoutResult {
  positions: Map<string, Position>;
  layers: LayerAssignment[];
  routingHints: RoutingHint[];
}

interface LayerAssignment {
  nodeId: string;
  layerId: string;
  y: number;
}

interface RoutingHint {
  wireId: string;
  suggestedPath: Position[];
  constraints: RoutingConstraint[];
}
```

### 5.3 线束路径路由器 (WireRouter)

**职责**：计算线束的路径，生成 SVG 路径数据。

```typescript
class WireRouter {
  route(wire: Wire, positions: Map<string, Position>, config: WireRules): RouteResult;
  routeAll(wires: Wire[], positions: Map<string, Position>, config: WireRules): RouteResult[];
  optimizeRoute(route: RouteResult): RouteResult;
}

interface RouteResult {
  wireId: string;
  path: string;              // SVG path d attribute
  midPoints: Position[];      // 中间拐点
  length: number;
}
```

### 5.4 样式解析器 (StyleResolver)

**职责**：根据元器件类型、ID 和状态解析最终样式。

```typescript
class StyleResolver {
  resolveNodeStyle(node: CircuitNode, config: StyleConfig): NodeStyleConfig;
  resolveWireStyle(wire: Wire, config: StyleConfig): WireStyleConfig;
  resolvePinStyle(pin: PinConfig, direction: PinDirection, config: StyleConfig): PinStyleConfig;
}
```

### 5.5 渲染引擎 (RenderEngine)

**职责**：协调各模块，生成最终 SVG 输出。

```typescript
class RenderEngine {
  render(circuit: CircuitData, config: Config): SVGElement;
  renderToSvgString(circuit: CircuitData, config: Config): string;
  renderToCanvas(circuit: CircuitData, config: Config): HTMLCanvasElement;
}
```

---

## 6. 布局规则详解

### 6.1 布局方向判定

根据回路表特征自动或手动指定布局方向。

| 条件 | 布局方向 | 说明 |
|------|----------|------|
| 存在电源入口 + 主控制器 + 针脚平均分布 | 垂直 (vertical) | 主控制器在中间，元器件上下分布 |
| 电源电路图（单一主元件，其他为省略式） | 水平 (horizontal) | 从左到右或从右到左 |

### 6.2 图层定义规则

元器件按类型划分到不同图层，图层顺序决定垂直位置。

| 图层ID | 图层名称 | 元器件类型 | 默认 Y 位置 |
|--------|----------|------------|-------------|
| power | 电源层 | power | 上方 |
| fuse | 保险丝层 | fuse | - |
| relay | 继电器层 | relay | - |
| switch | 开关层 | switch | - |
| splice | 接头层 | splice | - |
| connector | 连接器层 | connector | - |
| connector_plug | 对接插头层 | connector_plug | - |
| ecu | 控制器层 | ecu | 中间 |
| ground | 接地层 | ground | 下方 |

### 6.3 特殊元器件布局

#### 6.3.1 多入口电源

- **位置**：最上方（垂直）或最左侧（水平）
- **渲染**：多入口节点，左右/上下分布入口点

#### 6.3.2 电器盒

- **位置**：相对固定，通常在电源与控制器之间
- **内容**：包裹保险丝、继电器
- **渲染**：矩形容器，内部绘制所含元器件

#### 6.3.3 省略式元气件

- **渲染**：纯文本标签，不绘制图形
- **用途**：简化非关键元器件的表达

### 6.4 元器件排列规则

1. **控制器居中**：ECU/BCM 放置在布局的中间位置
2. **接地元器件在下**：接地节点统一放置在控制器下方
3. **电源元器件在上**：电源节点统一放置在控制器上方
4. **分类临近**：相同类型或功能类似的元器件临近排列
5. **入口/出口临近**：具有相同入口或出口的元器件临近排列

---

## 7. 线束渲染规则

### 7.1 线束颜色解析

```typescript
// 单色线束
const singleColor = 'R';  // 红色，直接渲染

// 复色线束
const multiColor = 'W/G';  // 白/绿双色
// 渲染规则：主色(W)在两侧，次色(G)在中间
// ━━━━━━G━━━━━━
// ████████████████  <- 主色 W 作为背景
// ━━━━━━G━━━━━━
```

### 7.2 线径与线宽映射

| 线径 (mm²) | 单线宽度 (px) | 复线宽度 (px) |
|------------|---------------|---------------|
| 0.5 | 1.5 | 1 |
| 0.85 | 2 | 1.2 |
| 1.25 | 2.5 | 1.5 |
| 2.0 | 3 | 2 |
| 3.0 | 4 | 2.5 |

### 7.3 针脚渲染规则

1. **方向判定**：根据线束连接方向判定针脚朝向（上、下、左、右）
2. **标签位置**：针脚标签位于针脚外侧
3. **标签格式**：元器件ID-针脚标识（如 `BCM-1`、`EF01-out`）
4. **连接点**：线束与针脚的连接点用小圆点标记

### 7.4 对接插头渲染

1. **方向判定**：根据线束走向判定插头朝向
2. **公母区分**：用不同图形区分公母插头
3. **多针脚**：支持多针脚连接器，左右/上下分布

---

## 8. 导出功能

### 8.1 SVG 导出

```typescript
interface SvgExportOptions {
  width?: number;
  height?: number;
  includeMetadata?: boolean;
  embedFonts?: boolean;
}

function exportToSvg(circuit: CircuitData, options: SvgExportOptions): string;
```

### 8.2 PDF 导出

```typescript
interface PdfExportOptions {
  format: 'A4' | 'A3' | 'letter' | 'custom';
  orientation: 'portrait' | 'landscape';
  margin: number;
  title?: string;
}

function exportToPdf(circuit: CircuitData, options: PdfExportOptions): Blob;
```

### 8.3 图片导出

```typescript
interface ImageExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality?: number;  // 0-1 for jpeg/webp
  scale?: number;   // 1x, 2x, 3x
}

function exportToImage(circuit: CircuitData, options: ImageExportOptions): Blob;
```

---

## 9. API 设计

### 9.1 核心 API

```typescript
// 创建电路图生成器实例
const generator = new CircuitGenerator(config: CircuitConfig);

// 加载电路数据
generator.loadCircuit(data: CircuitData): void;

// 计算布局
generator.computeLayout(): LayoutResult;

// 渲染到 SVG
generator.renderSvg(): string;

// 导出为 PDF
generator.exportPdf(options?: PdfExportOptions): Promise<Blob>;

// 导出为图片
generator.exportImage(options?: ImageExportOptions): Promise<Blob>;
```

### 9.2 配置 API

```typescript
// 更新元器件类型配置
generator.updateComponentType(type: string, config: Partial<ComponentConfig>): void;

// 更新布局配置
generator.updateLayout(config: Partial<LayoutConfig>): void;

// 更新样式配置
generator.updateStyle(config: Partial<StyleConfig>): void;

// 应用预设
generator.applyPreset(presetId: string): void;

// 导出配置
generator.exportConfig(): CircuitConfig;

// 导入配置
generator.importConfig(config: CircuitConfig): void;
```

### 9.3 查询 API

```typescript
// 获取元器件信息
generator.getNode(nodeId: string): CircuitNode | undefined;

// 获取元器件位置
generator.getPosition(nodeId: string): Position | undefined;

// 获取线束信息
generator.getWire(wireId: string): Wire | undefined;

// 获取线束路径
generator.getWirePath(wireId: string): string | undefined;

// 获取计算后的布局
generator.getLayoutResult(): LayoutResult;
```

---

## 10. 可扩展性设计

### 10.1 自定义元器件

支持用户通过配置定义新的元器件类型：

```typescript
const customComponent: ComponentConfig = {
  type: 'motor',
  category: 'execution',
  label: '电机',
  icon: '/icons/motor.svg',
  defaultPins: [
    { id: '正极', direction: 'right' },
    { id: '负极', direction: 'right' },
  ],
  renderDirection: 'horizontal',
  style: {
    fill: '#e8f5e9',
    stroke: '#4caf50',
    strokeWidth: 2,
  },
};
```

### 10.2 自定义布局算法

支持注册自定义布局算法：

```typescript
generator.registerLayoutAlgorithm('custom', {
  compute: (circuit, config) => {
    // 自定义布局逻辑
    return layoutResult;
  },
  constraints: ['layerOrder', 'nodeSpacing'],
});
```

### 10.3 自定义样式预设

支持创建和保存样式预设：

```typescript
generator.createStylePreset({
  id: 'dark-mode',
  name: '深色主题',
  config: {
    global: { backgroundColor: '#1e1e1e' },
    nodeStyles: { /* ... */ },
    wireStyles: { /* ... */ },
  },
});
```

---

## 11. 用户界面需求

### 11.1 配置编辑器

| 功能 | 说明 |
|------|------|
| 元器件配置面板 | 添加/编辑/删除元器件类型 |
| 布局配置面板 | 设置画布大小、图层顺序、间距 |
| 样式编辑器 | 可视化编辑颜色、字体、尺寸 |
| 线束规则面板 | 配置线色映射、线径规则 |

### 11.2 预览面板

| 功能 | 说明 |
|------|------|
| 实时预览 | 配置变更实时反映到预览图 |
| 缩放平移 | 支持鼠标滚轮缩放、拖拽平移 |
| 选中高亮 | 选中元器件时高亮显示关联线束 |
| 网格对齐 | 可开关的网格对齐辅助 |

### 11.3 导出面板

| 功能 | 说明 |
|------|------|
| 格式选择 | SVG / PDF / PNG / JPEG |
| 尺寸设置 | 输出尺寸、DPI、缩放比例 |
| 元数据编辑 | 标题、作者、版本等信息 |
| 批量导出 | 支持多电路图批量导出 |

---

## 12. 数据格式规范

### 12.1 配置文件格式

支持 JSON 和 YAML 格式：

```json
{
  "$schema": "circuit-generator://schema/v1",
  "meta": {},
  "nodes": [],
  "wires": [],
  "config": {}
}
```

### 12.2 文件扩展名

| 格式 | 扩展名 | MIME 类型 |
|------|--------|------------|
| JSON | `.circuit.json` | `application/json` |
| YAML | `.circuit.yaml` | `text/yaml` |
| SVG | `.circuit.svg` | `image/svg+xml` |
| PDF | `.circuit.pdf` | `application/pdf` |

---

## 13. 版本规划

### 13.1 MVP 版本 (v1.0)

- [ ] 基础元器件渲染（电源、接地、保险丝、继电器、开关、连接器、ECU）
- [ ] 垂直布局计算
- [ ] 基础线束渲染（单色、复色）
- [ ] SVG 导出
- [ ] 基础样式配置

### 13.2 v1.1 版本

- [ ] 水平布局支持
- [ ] 特殊元器件（电器盒、多入口电源、CAN 线）
- [ ] PDF 导出
- [ ] 布局优化算法
- [ ] 省略式元器件

### 13.3 v1.2 版本

- [ ] 自定义元器件类型
- [ ] 样式预设系统
- [ ] 图片导出
- [ ] 批量导出
- [ ] 配置导入导出

### 13.4 v2.0 版本

- [ ] 可视化配置编辑器
- [ ] 实时预览
- [ ] 布局算法插件系统
- [ ] 团队协作功能
- [ ] 版本管理

---

## 14. 附录

### 14.1 术语表

| 术语 | 说明 |
|------|------|
| 元器件 (Node) | 电路图中的元件，如保险丝、继电器、ECU |
| 线束 (Wire) | 连接元器件的导线 |
| 针脚 (Pin) | 元器件的连接点 |
| 图层 (Layer) | 按类型划分的元器件层级 |
| 回路表 | 描述电路连接关系的数据表 |
| 走线 (Routing) | 线束在画布上的路径规划 |

### 14.2 参考标准

- 汽车电路图绘制规范（行业标准）
- IEC 60617 电气图形符号标准
- SAE J1939 CAN 总线标准

### 14.3 依赖项

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "dagre": "^0.8.5",
    "jspdf": "^2.5.1",
    "svg2pdf.js": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@types/dagre": "^0.7.52"
  }
}
```
