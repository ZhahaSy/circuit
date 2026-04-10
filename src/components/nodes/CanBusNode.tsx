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
  const busGap = 8;
  const forkLen = 10;
  const busPad = 10; // 总线超出最外侧连接点的余量

  const connXs: number[] = pinInfo
    ? pinInfo.map(p => p.xOffset).sort((a, b) => a - b)
    : [0];

  const topY = -busGap / 2;
  const botY = busGap / 2;

  const minX = Math.min(...connXs) - busPad;
  const maxX = Math.max(...connXs) + busPad;

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
        const fromTop = pinInfo?.[i]?.side === 'top';
        const entryY = fromTop ? topY - forkLen : botY + forkLen;
        return (
          <g key={i}>
            <line x1={cx} y1={entryY} x2={cx - forkLen / 2} y2={topY}
              stroke={style.stroke} strokeWidth={style.strokeWidth} />
            <line x1={cx} y1={entryY} x2={cx + forkLen / 2} y2={botY}
              stroke={style.stroke} strokeWidth={style.strokeWidth} />
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
