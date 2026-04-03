import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
}

export function GroundNode({ label, style }: Props) {
  return (
    <>
      <line x1="0" y1="-20" x2="0" y2="0" stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <line x1="-14" y1="0" x2="14" y2="0" stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <line x1="-9" y1="6" x2="9" y2="6" stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <line x1="-4" y1="12" x2="4" y2="12" stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={0} y={28} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
    </>
  );
}
