import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  childCount: number;
  style: Required<NodeStyleConfig>;
}

/**
 * 电器盒容器 — 参考无线充电系统电路图标准符号
 * 灰色填充矩形，黑色边框，虚线分隔
 */
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
        rx={0}
        fill="#ccc"
        stroke="#000"
        strokeWidth={0.5}
        strokeDasharray="6 3"
      />
      <text
        x={-width / 2 + 8}
        y={-height / 2 + 14}
        fontSize={9}
        fill="#333"
        fontWeight="bold"
      >
        {label}
      </text>
    </>
  );
}
