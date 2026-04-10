import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
}

/**
 * CAN 总线节点 — 两条垂直平行线（CAN-H / CAN-L）
 */
export function CanBusNode({ label, style }: Props) {
  const halfGap = 50; // 两线间距 100px
  const halfH = 30;  // 线高度

  return (
    <>
      {/* CAN-H 线 */}
      <line x1={-halfGap} y1={-halfH} x2={-halfGap} y2={halfH} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* CAN-L 线 */}
      <line x1={halfGap} y1={-halfH} x2={halfGap} y2={halfH} stroke={style.stroke} strokeWidth={style.strokeWidth} />

      {/* 标签 */}
      <text x={halfGap + 8} y={4} textAnchor="start" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>
        {label}
      </text>
    </>
  );
}
