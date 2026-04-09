import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 保险丝 — 参考无线充电系统电路图标准符号
 * 两个圆形端子 + S 形熔断丝
 */
export function FuseNode({ label, sublabel, style }: Props) {
  const s = style.stroke;
  const sw = 1.2;
  return (
    <>
      {/* 灰色背景矩形 */}
      <rect x={-5} y={-14} width={10} height={28} rx={1} fill={style.fill} stroke="none" />

      {/* 上端子圆 */}
      <circle cx={0} cy={-10} r={3} fill="none" stroke={s} strokeWidth={sw} />
      {/* 下端子圆 */}
      <circle cx={0} cy={10} r={3} fill="none" stroke={s} strokeWidth={sw} />

      {/* S 形熔断丝（左半弧） */}
      <path
        d="M -2,-7 C -2.5,-2 2,0 2.5,2 C 3,4 -0.5,6 -2,7"
        fill="none"
        stroke={s}
        strokeWidth={sw}
      />
      {/* S 形熔断丝（右半弧） */}
      <path
        d="M 2,7 C 2.5,4 -2,2 -2.5,0 C -3,-2 0.5,-5 2,-7"
        fill="none"
        stroke={s}
        strokeWidth={sw}
      />

      {/* 上下引脚线 */}
      <line x1={0} y1={-13} x2={0} y2={-28} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={13} x2={0} y2={28} stroke="#333" strokeWidth={1.5} />

      {/* 标签 */}
      <text x={10} y={-4} textAnchor="start" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && <text x={10} y={8} textAnchor="start" fontSize={style.fontSize - 2} fill="#666">{sublabel}</text>}
    </>
  );
}
