import type { NodeStyleConfig } from '../../types';
import type { PinInfo } from '../../layout/pinResolver';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
  pinInfo?: PinInfo[];
}

/**
 * CAN 总线节点 — 两条垂直平行线（CAN-H / CAN-L）
 * 线的 X 位置由 pinInfo 驱动（和走线共用同一数据源）
 */
export function CanBusNode({ label, style, pinInfo }: Props) {
  const halfH = 30;  // 线高度

  // Derive line positions from pinInfo, fallback to ±50
  let lineXs: number[];
  if (pinInfo && pinInfo.length >= 2) {
    lineXs = pinInfo.map(p => p.xOffset).sort((a, b) => a - b);
  } else {
    lineXs = [-50, 50];
  }

  return (
    <>
      {lineXs.map((x, i) => (
        <line key={i} x1={x} y1={-halfH} x2={x} y2={halfH} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      ))}

      {/* 标签 */}
      <text x={Math.max(...lineXs) + 8} y={4} textAnchor="start" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>
        {label}
      </text>
    </>
  );
}
