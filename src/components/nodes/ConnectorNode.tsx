import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function ConnectorNode({ label, sublabel, style }: Props) {
  return (
    <>
      <rect x={-40} y={-20} width={80} height={40} rx={4} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={0} y={4} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      <text x={0} y={-26} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">{sublabel || ''}</text>
      <line x1={0} y1={-20} x2={0} y2={-34} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={20} x2={0} y2={34} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
