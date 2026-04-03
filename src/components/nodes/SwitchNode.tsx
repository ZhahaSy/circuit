import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function SwitchNode({ label, sublabel, style }: Props) {
  return (
    <>
      {/* 开关符号：两个端点 + 斜线 */}
      <circle cx={-12} cy={0} r={3} fill={style.stroke} stroke={style.stroke} strokeWidth={1} />
      <circle cx={12} cy={0} r={3} fill="none" stroke={style.stroke} strokeWidth={1.5} />
      <line x1={-9} y1={0} x2={10} y2={-8} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* 上下引脚线 */}
      <line x1={0} y1={-14} x2={0} y2={-28} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={8} x2={0} y2={28} stroke="#333" strokeWidth={1.5} />
      <text x={0} y={-32} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && (
        <text x={0} y={42} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">{sublabel}</text>
      )}
    </>
  );
}
