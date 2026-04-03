import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function RelayNode({ label, sublabel, style }: Props) {
  return (
    <>
      {/* 继电器：矩形框 + 内部线圈符号 */}
      <rect x={-30} y={-20} width={60} height={40} rx={2} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* 线圈符号 */}
      <path d="M -10,-6 Q -6,-12 -2,-6 Q 2,0 6,-6 Q 10,-12 14,-6" fill="none" stroke={style.stroke} strokeWidth={1.2} />
      {/* 触点标记 */}
      <line x1={-8} y1={6} x2={8} y2={6} stroke={style.stroke} strokeWidth={1} />
      <line x1={0} y1={6} x2={0} y2={12} stroke={style.stroke} strokeWidth={1} />
      {/* 上下引脚线 */}
      <line x1={0} y1={-20} x2={0} y2={-34} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={20} x2={0} y2={34} stroke="#333" strokeWidth={1.5} />
      <text x={0} y={-38} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && (
        <text x={0} y={50} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">{sublabel}</text>
      )}
    </>
  );
}
