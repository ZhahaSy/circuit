import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function ConnectorPlugNode({ label, sublabel, style }: Props) {
  return (
    <>
      {/* 插头主体 */}
      <rect x={-28} y={-16} width={56} height={32} rx={4} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* 插头引脚符号 */}
      <line x1={-12} y1={-16} x2={-12} y2={-24} stroke={style.stroke} strokeWidth={1.5} />
      <line x1={0} y1={-16} x2={0} y2={-24} stroke={style.stroke} strokeWidth={1.5} />
      <line x1={12} y1={-16} x2={12} y2={-24} stroke={style.stroke} strokeWidth={1.5} />
      {/* 底部连接线 */}
      <line x1={0} y1={16} x2={0} y2={24} stroke={style.stroke} strokeWidth={1.5} />
      {/* 标签 */}
      <text x={0} y={2} textAnchor="middle" fontSize={style.fontSize} fill={style.textColor} fontWeight="bold">
        {label}
      </text>
      {sublabel && (
        <text x={0} y={40} textAnchor="middle" fontSize={8} fill="#999">
          {sublabel}
        </text>
      )}
    </>
  );
}
