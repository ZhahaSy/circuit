import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 接头/接点 — 参考无线充电系统电路图标准符号
 * 圆形连接点 + 小矩形引脚标记
 */
export function SpliceNode({ label, style }: Props) {
  const s = style.stroke;
  return (
    <>
      {/* 连接点圆 */}
      <circle cx={0} cy={0} r={4.5} fill="#fff" stroke={s} strokeWidth={1.2} />
      {/* 中心引脚标记（小矩形） */}
      <rect x={-0.8} y={-3} width={1.6} height={6} fill={s} stroke={s} strokeWidth={0.5} />

      {/* 上下引脚线 */}
      <line x1={0} y1={-4.5} x2={0} y2={-24} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={4.5} x2={0} y2={24} stroke="#333" strokeWidth={1.5} />

      {/* 标签 */}
      <text x={10} y={4} textAnchor="start" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
    </>
  );
}
