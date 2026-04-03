import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function EcuNode({ label, sublabel, style }: Props) {
  return (
    <>
      <rect x={-50} y={-24} width={100} height={48} rx={6} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={0} y={0} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      <text x={0} y={14} textAnchor="middle" fontSize={8} fill="#666">{sublabel || ''}</text>
      <line x1={0} y1={-24} x2={0} y2={-38} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={24} x2={0} y2={38} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
