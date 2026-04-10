import type { NodeStyleConfig } from '../../types';
import type { PinInfo } from '../../layout/pinResolver';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
  pinInfo?: PinInfo[];
}

/**
 * CAN 总线节点 — 两条水平平行线（CAN-H / CAN-L）
 * 连接线通过 45° 斜线分叉接入
 */
export function CanBusNode({ label, style, pinInfo }: Props) {
  const busGap = 8;       // CAN-H 和 CAN-L 之间的间距
  const busHalfLen = 60;  // 总线半长度
  const forkLen = 10;     // 45° 斜线分叉长度

  // 连接点 X 位置（从 pinInfo 获取）
  const connXs: number[] = pinInfo
    ? pinInfo.map(p => p.xOffset).sort((a, b) => a - b)
    : [0];

  // 总线 Y 位置
  const topY = -busGap / 2;   // CAN-H
  const botY = busGap / 2;    // CAN-L

  // 总线水平范围：覆盖所有连接点 + 余量
  const minX = Math.min(-busHalfLen, ...connXs.map(x => x - 20));
  const maxX = Math.max(busHalfLen, ...connXs.map(x => x + 20));

  return (
    <>
      {/* CAN-H 水平线 */}
      <line x1={minX} y1={topY} x2={maxX} y2={topY}
        stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* CAN-L 水平线 */}
      <line x1={minX} y1={botY} x2={maxX} y2={botY}
        stroke={style.stroke} strokeWidth={style.strokeWidth} />

      {/* 每个连接点的 45° 分叉 */}
      {connXs.map((cx, i) => {
        // 判断连接方向（从上方还是下方接入）
        const fromTop = pinInfo?.[i]?.side === 'top';
        // 分叉起点 Y（线路到达的位置）
        const entryY = fromTop ? topY - forkLen : botY + forkLen;
        return (
          <g key={i}>
            {/* 主干到分叉点 */}
            {/* 分叉到 CAN-H */}
            <line x1={cx} y1={entryY} x2={cx - forkLen / 2} y2={topY}
              stroke={style.stroke} strokeWidth={style.strokeWidth} />
            {/* 分叉到 CAN-L */}
            <line x1={cx} y1={entryY} x2={cx + forkLen / 2} y2={botY}
              stroke={style.stroke} strokeWidth={style.strokeWidth} />
            {/* 连接点圆点 */}
            <circle cx={cx - forkLen / 2} cy={topY} r={2} fill={style.stroke} />
            <circle cx={cx + forkLen / 2} cy={botY} r={2} fill={style.stroke} />
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
