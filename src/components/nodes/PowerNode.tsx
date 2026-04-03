import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

export function PowerNode({ label, sublabel, style }: Props) {
  return (
    <>
      <polygon points="0,-18 12,6 -12,6" fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <line x1="0" y1="6" x2="0" y2="20" stroke={style.stroke} strokeWidth={style.strokeWidth} />
      <text x={0} y={-24} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      <text x={0} y={-36} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">{sublabel || ''}</text>
    </>
  );
}
