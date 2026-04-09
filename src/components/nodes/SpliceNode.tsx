import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 接头/接点 — 实心黑色圆点
 */
export function SpliceNode({ label, style }: Props) {
  return (
    <>
      {/* 实心连接点 */}
      <circle cx={0} cy={0} r={4} fill="#000" stroke="none" />

      {/* 上下引脚线 */}
      {/* <line x1={0} y1={-4} x2={0} y2={-24} stroke="#000" strokeWidth={0.8} /> */}
      {/* <line x1={0} y1={4} x2={0} y2={24} stroke="#000" strokeWidth={0.8} /> */}

      {/* 标签 */}
      <text x={10} y={4} textAnchor="start" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
    </>
  );
}
