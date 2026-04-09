import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  childCount: number;
  style: Required<NodeStyleConfig>;
}

/** 电器盒容器 — 在 CircuitSvg 中作为背景矩形包裹子节点 */
export function FuseBoxNode({ label, childCount, style }: Props) {
  const padding = 20;
  const childSpacing = 80;
  const width = Math.max(120, childCount * childSpacing + padding * 2);
  const height = 80;

  return (
    <>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={8}
        fill={style.fill || '#f7fafc'}
        stroke={style.stroke || '#a0aec0'}
        strokeWidth={style.strokeWidth || 2}
        strokeDasharray="6 3"
      />
      <text
        x={-width / 2 + 8}
        y={-height / 2 + 14}
        fontSize={9}
        fill={style.textColor || '#718096'}
        fontWeight="bold"
      >
        {label}
      </text>
    </>
  );
}
