import { LAYOUT } from '../layout/computePositions';

interface PowerBus {
  id: string;
  label: string;
}

interface Props {
  buses: PowerBus[];
  y: number;           // top Y of the bus bar region
  busSpacing?: number;  // vertical spacing between bus lines
}

const BUS_LINE_SPACING = 16;
const LABEL_MARGIN = 10;

/**
 * 电源母线区域：多条水平总线横贯全宽，左右两侧标注电源名称
 *
 *   IG1 ─────────────────────────────────── IG1
 *   IG3 ─────────────────────────────────── IG3
 *   ACC ─────────────────────────────────── ACC
 */
export function PowerBusBar({ buses, y, busSpacing = BUS_LINE_SPACING }: Props) {
  const left = LAYOUT.marginLeft - 20;
  const right = LAYOUT.width - LAYOUT.marginRight + 20;
  const totalHeight = (buses.length - 1) * busSpacing;

  return (
    <g id="power-bus-bar">
      {/* 背景区域 */}
      <rect
        x={left}
        y={y - 8}
        width={right - left}
        height={totalHeight + 16}
        rx={2}
        fill="#FFFBEB"
        stroke="#F6E05E"
        strokeWidth={0.5}
        opacity={0.5}
      />
      {buses.map((bus, i) => {
        const lineY = y + i * busSpacing;
        return (
          <g key={bus.id}>
            {/* 水平母线 */}
            <line
              x1={left}
              y1={lineY}
              x2={right}
              y2={lineY}
              stroke="#B7791F"
              strokeWidth={1.5}
            />
            {/* 左侧标签 */}
            <text
              x={left - LABEL_MARGIN}
              y={lineY + 3.5}
              textAnchor="end"
              fontSize={10}
              fontWeight="bold"
              fill="#975A16"
            >
              {bus.label}
            </text>
            {/* 右侧标签 */}
            <text
              x={right + LABEL_MARGIN}
              y={lineY + 3.5}
              textAnchor="start"
              fontSize={10}
              fontWeight="bold"
              fill="#975A16"
            >
              {bus.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** 计算母线区域的总高度 */
export function getBusBarHeight(busCount: number, busSpacing = BUS_LINE_SPACING): number {
  if (busCount <= 0) return 0;
  return (busCount - 1) * busSpacing + 16; // 16 = top/bottom padding
}

/** 获取某条母线的 Y 坐标 */
export function getBusLineY(busIndex: number, busBarTopY: number, busSpacing = BUS_LINE_SPACING): number {
  return busBarTopY + busIndex * busSpacing;
}
