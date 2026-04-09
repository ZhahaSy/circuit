import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 接地 — 参考无线充电系统电路图标准符号
 * 标准接地符号：竖线 + 三条递减横线
 */
export function GroundNode({ label, style }: Props) {
  const s = style.stroke;
  const sw = style.strokeWidth;
  return (
    <>
      {/* 上方引脚线 */}
      <line x1={0} y1={-20} x2={0} y2={0} stroke={s} strokeWidth={sw} />
      {/* 三条递减横线 */}
      <line x1={-12} y1={0} x2={12} y2={0} stroke={s} strokeWidth={sw} />
      <line x1={-8} y1={5} x2={8} y2={5} stroke={s} strokeWidth={sw} />
      <line x1={-4} y1={10} x2={4} y2={10} stroke={s} strokeWidth={sw} />
      {/* 标签 */}
      <text x={0} y={24} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
    </>
  );
}
