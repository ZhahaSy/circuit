import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 继电器 — 参考无线充电系统电路图标准符号
 * 矩形框 + 内部线圈符号 + 触点
 */
export function RelayNode({ label, sublabel, style }: Props) {
  const s = style.stroke;
  return (
    <>
      {/* 继电器矩形框 */}
      <rect x={-28} y={-18} width={56} height={36} rx={0} fill={style.fill} stroke={s} strokeWidth={style.strokeWidth} />
      {/* 线圈符号（波浪线） */}
      <path
        d="M -12,-4 Q -8,-12 -4,-4 Q 0,4 4,-4 Q 8,-12 12,-4"
        fill="none"
        stroke={s}
        strokeWidth={1.2}
      />
      {/* 触点标记 */}
      <line x1={-8} y1={8} x2={8} y2={8} stroke={s} strokeWidth={1} />
      <line x1={0} y1={8} x2={0} y2={14} stroke={s} strokeWidth={1} />
      {/* 上下引脚线 */}
      <line x1={0} y1={-18} x2={0} y2={-32} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={18} x2={0} y2={32} stroke="#333" strokeWidth={1.5} />
      {/* 标签 */}
      <text x={0} y={-36} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && (
        <text x={0} y={46} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">{sublabel}</text>
      )}
    </>
  );
}
