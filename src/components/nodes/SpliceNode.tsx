import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
}

export function SpliceNode({ label, style }: Props) {
  return (
    <>
      <circle cx={0} cy={0} r={6} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={0} y={-14} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      <line x1={0} y1={-6} x2={0} y2={-24} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={6} x2={0} y2={24} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
