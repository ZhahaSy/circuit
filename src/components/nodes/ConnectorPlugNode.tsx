import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  pins?: string[];
  style: Required<NodeStyleConfig>;
}

/**
 * 对接插头 — 线束从上端进、下端出
 * 上半为母端（圆点），下半为公端（弧钩）
 * 箭头从母端指向公端（从上往下）
 */
export function ConnectorPlugNode({ label, sublabel, style }: Props) {
  const s = style.stroke;
  return (
    <>
      {/* 上方竖线（母端入线） */}
      <line x1={0} y1={-24} x2={0} y2={-5} stroke={s} strokeWidth={1.5} />

      {/* 母端：实心圆点 */}
      <circle cx={0} cy={-5} r={3.5} fill={s} />

      {/* 公端：小弧钩（开口朝上，对准圆点） */}
      <path
        d="M -5 -1 Q -5 8, 0 8 Q 5 8, 5 -1"
        fill="none"
        stroke={s}
        strokeWidth={1.5}
      />

      {/* 箭头：母端→公端方向，在弧钩下方 */}
      <path
        d="M -4 14 L 0 20 L 4 14"
        fill="none"
        stroke={s}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* 下方竖线（公端出线） */}
      <line x1={0} y1={8} x2={0} y2={14} stroke={s} strokeWidth={1.5} />
      <line x1={0} y1={20} x2={0} y2={24} stroke={s} strokeWidth={1.5} />

      {/* 标签 */}
      <text
        x={14}
        y={2}
        textAnchor="start"
        fontSize={style.fontSize}
        fontWeight="bold"
        fill={style.textColor}
      >
        {label}
      </text>
      {sublabel && (
        <text x={14} y={14} textAnchor="start" fontSize={8} fill="#999">
          {sublabel}
        </text>
      )}
    </>
  );
}
