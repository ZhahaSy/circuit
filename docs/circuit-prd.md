# 汽车电路图可配置化生成器 — 产品需求文档（PRD）

## 1. 背景与目标

### 1.1 背景
汽车售后手册中的电路图目前依赖人工对照设计院图纸进行绘制，效率低、一致性差、维护成本高。期望基于**电路回路表**数据，通过可配置化的方式自动生成符合行业规范的电路图。

### 1.2 产品目标
- 基于结构化回路表数据，自动生成汽车电路图
- 提供可视化配置界面，支持元器件、布局、样式的灵活调整
- 输出符合售后手册标准的电路图（SVG / PDF）
- 降低电路图制作周期，减少人工干预

### 1.3 目标用户
- 汽车售后手册编辑人员
- 电路图设计工程师

---

## 2. 核心概念

### 2.1 电路回路表
电路回路表是电路图生成的数据源，描述了电路中各元器件之间的连接关系。包含：
- 元器件清单（类型、名称、针脚定义）
- 线束连接关系（起点/终点元器件及针脚、线色、线径）
- 电路所属系统分类

### 2.2 绘制方向
| 绘制方向 | 适用条件 | 说明 |
|---------|---------|------|
| 垂直绘制 | 存在电源入口 + 主控制器 + 控制器针脚相对平均 | 电源在上，接地在下，信号纵向流动 |
| 水平绘制 | 电源电路图（单个主元件，其他元件省略式表达） | 电源在左，信号横向流动 |

---

## 3. 元器件体系

### 3.1 基础元器件

| 元器件名称 | 类型标识 | 分类 | 渲染方式 | 说明 |
|-----------|---------|------|---------|------|
| 电源 | `power` | 电源类 | 特殊定制 | 默认使用多入口电源元件 |
| 接地 | `ground` | 接地类 | 标准 | 电路回路接地点，始终位于控制器下方 |
| 保险丝 | `fuse` | 保护类 | 标准 | 过流保护，包裹在电器盒内部 |
| 继电器 | `relay` | 控制类 | 标准 | 电路开关控制，包裹在电器盒内部 |
| 开关 | `switch` | 控制类 | 标准 | 手动控制通断 |
| 传感器 | `sensor` | 检测类 | 标准 | 采集信号输入 |
| 执行器 | `actuator` | 执行类 | 标准 | 执行控制输出 |
| 电阻 | `resistor` | 被动元件 | 标准 | 限流、分压 |
| 电容 | `capacitor` | 被动元件 | 标准 | 滤波、储能 |
| 二极管 | `diode` | 半导体 | 标准 | 单向导通 |
| 三极管 | `transistor` | 半导体 | 标准 | 放大、开关 |
| 集成电路 | `ic` | 芯片类 | 标准 | 复杂功能处理 |
| 连接器 | `connector` | 连接类 | 标准 | 线束对接 |
| 连接点 | `splice` | 连接类 | 标准 | 线束合并节点 |

### 3.2 特殊元器件

| 元器件名称 | 类型标识 | 说明 | 特殊渲染逻辑 |
|-----------|---------|------|-------------|
| 电器盒 | `fuseBox` | 继电器与保险丝的载体 | 容器型元件，内部包含子元器件，位置相对固定。电器盒内每个保险丝/继电器拥有独立针脚，通过各自的线束分别连接到多入口电源的不同输出端（如 IG、ACC、B+ 等），不同保险丝/继电器对应不同的电源回路 |
| 多入口电源 | `powerMulti` | 提供 IG / ACC / B+ 等不同电路接点 | 多端口元件，位于最上方/最左侧。每个输出端口对应一个电源回路标识，通过独立线束分别连接到电器盒内不同的保险丝或继电器针脚 |
| CAN线 | `canBus` | 控制器信号通信线束 | 两两一组出现，标注所属CAN系统（S-CAN / C-CAN等），非通讯系统中无对接点 |
| 省略式元器件 | `abbreviated` | 非重点元器件的简化表达 | 纯文本渲染，无图形符号 |
| 对接插头 | `connectorPlug` | 多线束对接，区分公母 | 根据线束走向判定方向，分别对应不同针脚 |

### 3.3 元器件配置能力

每个元器件支持以下配置项：

```typescript
interface ComponentConfig {
  id: string;                    // 唯一标识
  type: ComponentType;           // 元器件类型
  label: string;                 // 显示名称
  sublabel?: string;             // 副标题（如型号）
  pins: PinConfig[];             // 针脚配置
  customSvg?: string;            // 自定义SVG图形
  orientation?: 'horizontal' | 'vertical';  // 渲染方向
  style?: NodeStyleOverride;     // 样式覆盖
}

interface PinConfig {
  id: string;                    // 针脚标识（如 BF01-1）
  label: string;                 // 针脚显示名
  side: 'top' | 'bottom' | 'left' | 'right';  // 针脚方向
}
```

---

## 4. 布局系统

### 4.1 分层布局

电路图采用分层布局策略，元器件按类型和逻辑关系分配到不同层级：

| 层级 | 内容 | 位置规则 |
|------|------|---------|
| 第1层 | 多入口电源 | 最上方（垂直）/ 最左侧（水平） |
| 第2层 | 电器盒（保险丝 + 继电器） | 电源下方 |
| 第3层 | 开关、传感器等控制/检测元件 | 电器盒与控制器之间 |
| 第4层 | 控制器（ECU） | 居中位置，上下两面分布插头 |
| 第5层 | 执行器、连接器等 | 控制器下方 |
| 第6层 | 接地 | 最下方（垂直）/ 最右侧（水平） |

### 4.2 层级配置

```typescript
interface LayerConfig {
  id: string;
  label: string;                           // 层级名称
  types: ComponentType[];                  // 该层包含的元器件类型
  direction?: 'horizontal' | 'vertical';   // 层内排列方向
  spacing?: number;                        // 层内元器件间距
  sortStrategy?: 'barycenter' | 'manual' | 'adjacency';  // 排序策略
}
```

### 4.3 自动布局算法

- 层间位置：按层级顺序等距分布，支持自定义层间距
- 层内排序：采用重心法（Barycenter Heuristic）最小化线束交叉
  - 多轮迭代优化（自上而下 + 自下而上交替）
  - 基于跨层连接关系计算节点权重
- 手动微调：支持拖拽调整单个元器件位置，覆盖自动布局结果

### 4.4 元器件排版规则

1. 相同或分类类似的元器件临近排版
2. 入口或出口相同的元器件临近排版
3. 控制器非全部针脚展示时，使用带有非全部针脚的控制器组件
4. 控制器内部仅展示控制器名称（居中），所有针脚号在控制器外侧展示
5. 电器盒内的保险丝/继电器各自拥有独立针脚，分别通过不同线束连接到多入口电源的对应输出端（IG/ACC/B+等），线束上标注线色和线径
6. 多入口电源的每个输出端口需标注电源回路标识（如 IG、ACC、B+），各输出端口分别引出独立线束到电器盒内对应的保险丝/继电器

---

## 5. 线束与连接系统

### 5.1 线束数据模型

```typescript
interface Wire {
  id: string;
  from: { nodeId: string; pinId: string };   // 起点
  to: { nodeId: string; pinId: string };     // 终点
  colorCode: string;      // 线色编码（如 "R/W" 表示红底白条纹）
  gauge?: string;         // 线径（如 "0.5mm²"）
  wireType?: 'standard' | 'can';  // 线束类型
  canSystem?: string;     // CAN线所属系统（S-CAN / C-CAN）
}
```

### 5.2 线色渲染规则

| 类型 | 规则 | 示例 |
|------|------|------|
| 单色线束 | 直接渲染对应颜色 | `R` → 红色实线 |
| 复色线束 | 主色为底色（4px），次色为中间条纹（2px） | `R/W` → 红底白条纹 |

线色映射表：

| 编码 | 颜色 | 色值 |
|------|------|------|
| R | 红 | #FF0000 |
| B | 蓝 | #0000FF |
| G | 绿 | #008000 |
| Y | 黄 | #FFD700 |
| W | 白 | #FFFFFF |
| Br | 棕 | #8B4513 |
| O | 橙 | #FFA500 |
| P | 粉 | #FFC0CB |
| V | 紫 | #800080 |
| Gr | 灰 | #808080 |

### 5.3 线束路由

- 同列节点：直线连接
- 跨列节点：多通道路由，自动分配通道避免重叠
- 线束标签：在线束中段显示线色编码和线径信息

### 5.4 针脚展示规则

- 针脚方向根据线束走向自动判定（上/下/左/右）
- **针脚号在元器件外部展示**：针脚标签（如 `BF01-1`）显示在针脚连接点的右侧，紧邻线束起始/终止位置，而非元器件内部
- 所有元器件（控制器、连接器、保险丝、继电器等）的每条线束连接都必须标注对应的针脚号
- 控制器内部仅展示控制器名称（居中），针脚号全部在控制器边框外侧、对应连接点旁展示
- 对接插头区分公母，分别对应不同针脚，针脚号同样在插头外侧展示

---

## 6. 样式配置系统

### 6.1 样式层级

样式采用三级覆盖机制，优先级从低到高：

1. **全局默认样式** — 所有元器件的基础样式
2. **类型样式** — 按元器件类型设置（如所有保险丝统一样式）
3. **实例样式** — 按元器件ID单独覆盖

### 6.2 可配置样式属性

```typescript
interface StyleConfig {
  // 节点样式
  node?: {
    fill?: string;           // 填充色
    stroke?: string;         // 边框色
    strokeWidth?: number;    // 边框宽度
    opacity?: number;        // 透明度
    textColor?: string;      // 文字颜色
    fontSize?: number;       // 字号
    fontFamily?: string;     // 字体
  };
  // 线束样式
  wire?: {
    primaryWidth?: number;   // 主线宽度（默认4px）
    secondaryWidth?: number; // 复线宽度（默认2px）
    opacity?: number;        // 透明度
  };
  // 层级样式
  layer?: {
    separatorColor?: string; // 层分隔线颜色
    separatorStyle?: 'solid' | 'dashed' | 'none';
    labelVisible?: boolean;  // 是否显示层标签
  };
}
```

---

## 7. 规则配置模板

### 7.1 模板概念

不同汽车项目/车型的电路图生成规则存在差异（如线色编码体系、电器盒结构、布局偏好等）。系统将所有生成规则抽象为「规则配置模板」（RuleTemplate），一个模板包含完整的四大维度规则，不同项目加载不同模板即可生成符合各自规范的电路图。

- 一个 RuleTemplate = 一套完整的生成规则（连接 + 线束 + 布局 + 针脚）
- 系统内置默认模板，用户可基于默认模板创建项目/车型专属模板
- 模板支持保存、加载、导入导出（JSON）、复制
- 切换模板后，电路图实时按新规则重新生成

### 7.2 规则维度

#### A. 元器件连接规则 `connectionRules`

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 电器盒包含类型 | `ComponentType[]` | `['fuse', 'relay']` | 哪些元器件类型必须包裹在电器盒内部 |
| 接地位置约束 | `enum` | `below_controller` | 接地元器件相对于控制器的位置（下方/上方/自由） |
| 电源输出端口 | `PowerPort[]` | `[{id:'IG'}, {id:'ACC'}, {id:'B+'}]` | 多入口电源的输出端口定义，可增删 |
| 独立接线 | `boolean` | `true` | 电器盒内元件是否通过独立线束分别连接到电源 |
| 连接约束 | `ConnectionConstraint[]` | — | 元器件间的连接约束规则（如：保险丝必须连接电源） |

#### B. 线束生成规则 `wireRules`

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 线色编码映射 | `Record<string, string>` | `{R:'#FF0000', B:'#0000FF', ...}` | 线色编码到色值的映射表，可自定义 |
| 复色分隔符 | `string` | `"/"` | 复色线束的颜色分隔符 |
| 主线宽度 | `number` | `4` | 单色/主色线束宽度（px） |
| 复线宽度 | `number` | `2` | 复色线束中次色条纹宽度（px） |
| 标签格式 | `string` | `"{colorCode} {gauge}mm²"` | 线束标签的显示格式模板 |
| 标签显示 | `boolean` | `true` | 是否在线束上显示标签 |

#### C. 布局规则 `layoutRules`

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 默认绘制方向 | `enum` | `auto` | 垂直/水平/自动判定 |
| 垂直绘制条件 | `object` | `{requirePower:true, requireController:true}` | 自动判定为垂直绘制的条件 |
| 层级顺序 | `LayerTemplate[]` | 电源→电器盒→开关→控制器→连接器→接地 | 默认层级结构，可调整顺序和数量 |
| 层间距 | `number` | `120` | 层与层之间的间距（px） |
| 层内间距 | `number` | `80` | 同层元器件之间的间距（px） |
| 排序策略 | `enum` | `barycenter` | 层内排序算法（barycenter/manual/adjacency） |
| 迭代次数 | `number` | `4` | 重心法优化的迭代轮数 |

#### D. 针脚展示规则 `pinRules`

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| 标签位置 | `enum` | `outside` | 针脚标签在元器件外部/内部展示 |
| 标签格式 | `string` | `"{pinId}"` | 针脚标签的显示格式（支持 {nodeId}、{pinId}、{pinIndex}） |
| 控制器内显示针脚 | `boolean` | `false` | 控制器内部是否显示针脚信息（默认仅显示名称） |
| 方向自动判定 | `boolean` | `true` | 是否根据线束走向自动判定针脚方向 |

### 7.3 模板数据模型

```typescript
/** 规则配置模板 */
interface RuleTemplate {
  id: string;
  name: string;                        // 如 "丰田通用模板"、"宝马G系列模板"
  description?: string;
  manufacturer?: string;               // 厂商标识
  vehicleSeries?: string;              // 车系标识
  isBuiltin: boolean;                  // 是否为内置模板（不可删除）
  createdAt: string;
  updatedAt: string;

  connectionRules: ConnectionRuleConfig;
  wireRules: WireRuleConfig;
  layoutRules: LayoutRuleConfig;
  pinRules: PinRuleConfig;
}

/** 元器件连接规则 */
interface ConnectionRuleConfig {
  fuseBoxContainedTypes: ComponentType[];
  groundPlacement: 'below_controller' | 'above_controller' | 'free';
  powerOutputPorts: PowerPort[];
  fuseBoxIndependentWiring: boolean;
  connectionConstraints: ConnectionConstraint[];
}

interface PowerPort {
  id: string;
  label: string;
  description?: string;
}

interface ConnectionConstraint {
  fromType: ComponentType;
  toType: ComponentType;
  required: boolean;
  description?: string;
}

/** 线束生成规则 */
interface WireRuleConfig {
  colorCodeMap: Record<string, string>;
  multiColorSeparator: string;
  primaryWidth: number;
  secondaryWidth: number;
  labelFormat: string;
  labelVisible: boolean;
}

/** 布局规则 */
interface LayoutRuleConfig {
  defaultDirection: 'vertical' | 'horizontal' | 'auto';
  verticalCondition: {
    requirePower: boolean;
    requireController: boolean;
    requireBalancedPins: boolean;
  };
  layerTemplate: LayerTemplate[];
  layerSpacing: number;
  nodeSpacing: number;
  sortStrategy: 'barycenter' | 'manual' | 'adjacency';
  barycenterIterations: number;
}

interface LayerTemplate {
  id: string;
  label: string;
  types: ComponentType[];
}

/** 针脚展示规则 */
interface PinRuleConfig {
  labelPosition: 'outside' | 'inside';
  labelFormat: string;
  showPinsInsideController: boolean;
  autoDetectDirection: boolean;
}
```

### 7.4 模板管理功能

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 模板列表 | 展示内置模板和自定义模板，支持搜索 | P0 |
| 创建模板 | 基于默认模板或已有模板创建新模板 | P0 |
| 编辑模板 | 可视化编辑四大维度的规则配置 | P0 |
| 复制模板 | 复制已有模板为新模板 | P0 |
| 删除模板 | 删除自定义模板（内置模板不可删除） | P0 |
| 导入/导出 | 以 JSON 格式导入导出模板 | P1 |
| 应用模板 | 将模板设为当前项目的生成规则 | P0 |
| 实时预览 | 切换/编辑模板时，电路图按新规则实时重新生成 | P1 |

---

## 8. 功能模块

### 7.1 数据输入

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 回路表JSON导入 | 支持导入结构化JSON格式的回路表数据 | P0 |
| 回路表Excel导入 | 支持导入Excel格式的回路表（后续版本） | P1 |
| 示例数据加载 | 内置典型电路示例，快速体验 | P0 |
| 数据校验 | 导入时校验数据完整性（节点引用、针脚匹配） | P0 |

### 7.2 可视化配置面板

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 层级管理 | 添加/删除/排序层级，分配元器件类型 | P0 |
| 元器件拖拽 | 拖拽调整元器件在层内的位置 | P0 |
| 样式编辑器 | 可视化调整节点/线束/层级样式 | P0 |
| 自定义SVG上传 | 为特定元器件上传自定义SVG图形 | P1 |
| 绘制方向切换 | 垂直/水平绘制模式切换 | P0 |
| 实时预览 | 配置变更实时反映到电路图预览 | P0 |

### 7.3 电路图渲染

| 功能 | 说明 | 优先级 |
|------|------|--------|
| SVG渲染 | 基于配置数据生成SVG电路图 | P0 |
| 自动布局 | 重心法分层布局 + 交叉最小化 | P0 |
| 线束路由 | 智能路由避免重叠，支持多通道 | P0 |
| 线束悬停高亮 | 鼠标悬停时高亮当前线束，淡化其他 | P0 |
| 电器盒渲染 | 容器型元件，内部包含保险丝/继电器 | P1 |
| CAN线渲染 | 两两一组，标注所属CAN系统 | P1 |
| 省略式元器件 | 纯文本简化渲染 | P1 |

### 7.4 导出

| 功能 | 说明 | 优先级 |
|------|------|--------|
| PDF导出 | 导出为矢量PDF文件 | P0 |
| SVG导出 | 导出为SVG文件 | P0 |
| PNG导出 | 导出为位图（可配置分辨率） | P1 |
| JSON导出 | 导出当前配置数据（含布局位置） | P0 |
| 批量导出 | 多个回路表批量生成电路图 | P2 |

---

## 9. 数据模型总览

```typescript
/** 完整电路图数据 */
interface CircuitData {
  meta: {
    name: string;              // 电路图名称
    system: string;            // 所属系统（如"前照灯系统"）
    direction: 'vertical' | 'horizontal';  // 绘制方向
    version: string;           // 数据版本
  };
  nodes: CircuitNode[];        // 元器件列表
  wires: Wire[];               // 线束连接列表
  layers: LayerConfig[];       // 层级配置
  style?: StyleConfig;         // 样式配置
  fuseBoxes?: FuseBoxConfig[]; // 电器盒配置
}

/** 电器盒配置 */
interface FuseBoxConfig {
  id: string;
  label: string;
  children: string[];          // 包含的元器件ID列表（保险丝/继电器）
}
```

---

## 10. 技术方案

### 10.1 技术栈
- 前端框架：React 19 + TypeScript
- 构建工具：Vite
- 渲染引擎：SVG（原生）
- PDF导出：jsPDF + svg2pdf.js
- 布局算法：自研分层布局（Barycenter Heuristic）

### 10.2 架构分层

```
┌─────────────────────────────────────┐
│           配置面板 (UI)              │
│  层级管理 │ 样式编辑 │ 数据导入导出   │
├─────────────────────────────────────┤
│           状态管理层                 │
│  CircuitData │ Positions │ Styles   │
├─────────────────────────────────────┤
│           布局引擎                   │
│  分层布局 │ 重心排序 │ 线束路由       │
├─────────────────────────────────────┤
│           渲染引擎 (SVG)             │
│  节点渲染 │ 线束渲染 │ 交互事件       │
├─────────────────────────────────────┤
│           导出模块                   │
│  PDF │ SVG │ PNG │ JSON             │
└─────────────────────────────────────┘
```

---

## 11. 里程碑规划

### MVP（第一阶段）
- 基础元器件渲染（电源、接地、保险丝、继电器、开关、连接器、控制器）
- 垂直方向自动布局
- 线束连接与线色渲染
- 层级管理与拖拽调整
- 样式配置面板
- JSON导入导出
- PDF导出

### V1.0（第二阶段）
- 电器盒容器渲染
- 多入口电源元件
- CAN线渲染
- 省略式元器件
- 水平绘制模式
- 对接插头公母区分
- 自定义SVG上传
- Excel回路表导入
- 规则配置模板系统（模板管理、四维度规则配置、模板导入导出）

### V2.0（第三阶段）
- 批量生成
- 模板市场（共享/下载社区模板）
- 多电路图联动展示
- 协同编辑
- 版本对比

---

## 12. 验收标准

1. 导入回路表JSON后，可自动生成布局合理、无线束重叠的电路图
2. 所有元器件类型均可正确渲染，特殊元器件符合定制规则
3. 线束颜色（单色/复色）渲染正确，线径标注准确
4. 层级可自由调整，拖拽后布局实时更新
5. 导出的PDF矢量清晰，可用于印刷
6. 针脚信息展示正确，方向判定符合线束走向
7. 电器盒正确包裹内部保险丝/继电器
8. 接地元器件始终位于控制器下方
9. 规则配置模板可正常创建、编辑、复制、删除
10. 切换模板后电路图按新规则重新生成，结果符合模板定义
11. 模板可导入导出为 JSON 文件，跨项目复用
