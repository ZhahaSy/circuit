import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function FuseNode({ label, sublabel, style }: Props) {
  return (
    <>
      <rect x={-24} y={-14} width={48} height={28} rx={3} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <line x1={-10} y1={0} x2={10} y2={0} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={0} y={4} textAnchor="middle" fontSize={style.fontSize} fill={style.textColor}>{label}</text>
      <text x={0} y={-20} textAnchor="middle" fontSize={style.fontSize} fill="#666">{sublabel || ''}</text>
      <line x1={0} y1={-14} x2={0} y2={-28} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={14} x2={0} y2={28} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
