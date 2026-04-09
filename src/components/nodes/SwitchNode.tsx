import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 开关 — 参考无线充电系统电路图标准符号
 * 两个端子圆 + 斜线（断开状态）
 */
export function SwitchNode({ label, sublabel, style }: Props) {
  const s = style.stroke;
  return (
    <>
      {/* 固定端子 */}
      <circle cx={0} cy={8} r={3} fill={s} stroke={s} strokeWidth={1} />
      {/* 活动端子 */}
      <circle cx={0} cy={-8} r={3} fill="none" stroke={s} strokeWidth={1.2} />
      {/* 开关臂（斜线，断开状态） */}
      <line x1={0} y1={-5} x2={8} y2={5} stroke={s} strokeWidth={style.strokeWidth} />
      {/* 上下引脚线 */}
      <line x1={0} y1={-11} x2={0} y2={-28} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={11} x2={0} y2={28} stroke="#333" strokeWidth={1.5} />
      {/* 标签 */}
      <text x={14} y={-4} textAnchor="start" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && (
        <text x={14} y={8} textAnchor="start" fontSize={style.fontSize - 2} fill="#666">{sublabel}</text>
      )}
    </>
  );
}
