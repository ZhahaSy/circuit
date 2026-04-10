import type { NodeStyleConfig } from '../../types';
import type { PinInfo } from '../../layout/pinResolver';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
  pinInfo?: PinInfo[];
}

/**
 * CAN 总线节点 — 两条水平平行线 + 桥形连接符号
 * 连接符号: 中间V形入口 + 两侧弧形展开 + 末端下垂连接总线
 */
export function CanBusNode({ label, style, pinInfo }: Props) {
  const busGap = 8;
  const busHalfLen = 60;

  const connXs: number[] = pinInfo
    ? pinInfo.map(p => p.xOffset).sort((a, b) => a - b)
    : [0];

  const topY = -busGap / 2;
  const botY = busGap / 2;

  const minX = Math.min(-busHalfLen, ...connXs.map(x => x - 20));
  const maxX = Math.max(busHalfLen, ...connXs.map(x => x + 20));

  /**
   * 桥形连接符号（参考原始 SVG path 等比缩放）
   * 从线路入口（V形顶部）向下展开连接到 CAN-H / CAN-L
   *
   * @param cx 连接点中心 X
   * @param fromTop true=线路从上方接入
   */
  function bridgePath(cx: number, fromTop: boolean): string {
    // 符号参数（基于原始 path 缩放）
    const hw = 16;        // 半宽（到总线连接点的水平距离）
    const notchDx = 1.6;  // V 形缺口半宽
    const notchDy = 2.7;  // V 形缺口深度
    const curveDy = 2.5;  // 弧形深度
    const dropDy = 2;     // 末端下垂

    const dir = fromTop ? -1 : 1; // 方向：fromTop 时符号向上展开
    // V 形顶点 Y（线路连接点）
    const tipY = fromTop ? topY - (notchDy + curveDy + dropDy) : botY + (notchDy + curveDy + dropDy);

    // 从左端开始画
    return [
      `M ${cx - hw} ${(fromTop ? topY : botY) - dir * dropDy}`,
      `l 0 ${dir * dropDy}`,
      `c 0 0, 0.5 ${dir * curveDy}, ${hw - notchDx} ${dir * curveDy}`,
      `l ${notchDx} ${dir * notchDy}`,
      `l ${notchDx} ${-dir * notchDy}`,
      `c ${hw - notchDx - 0.5} 0, ${hw - notchDx} ${-dir * curveDy}, ${hw - notchDx} ${-dir * curveDy}`,
      `l 0 ${-dir * dropDy}`,
    ].join(' ');
  }

  return (
    <>
      {/* CAN-H 水平线 */}
      <line x1={minX} y1={topY} x2={maxX} y2={topY}
        stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* CAN-L 水平线 */}
      <line x1={minX} y1={botY} x2={maxX} y2={botY}
        stroke={style.stroke} strokeWidth={style.strokeWidth} />

      {/* 每个连接点的桥形符号 */}
      {connXs.map((cx, i) => {
        const fromTop = pinInfo?.[i]?.side === 'top';
        return (
          <g key={i}>
            <path d={bridgePath(cx, fromTop)} fill="none"
              stroke={style.stroke} strokeWidth={style.strokeWidth}
              strokeLinecap="round" strokeLinejoin="round" />
            {/* 总线连接点圆点 */}
            <circle cx={cx - 16} cy={fromTop ? topY : botY} r={2} fill={style.stroke} />
            <circle cx={cx + 16} cy={fromTop ? topY : botY} r={2} fill={style.stroke} />
          </g>
        );
      })}

      {/* 标签 */}
      <text x={maxX + 8} y={4} textAnchor="start"
        fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>
        {label}
      </text>
    </>
  );
}
