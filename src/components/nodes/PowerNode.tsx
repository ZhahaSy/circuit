import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 电源 — 参考无线充电系统电路图标准符号
 * 三角形 + 竖线，标准电源符号
 */
export function PowerNode({ label, sublabel, style }: Props) {
  return (
    <>
      {/* 电源三角 */}
      <polygon
        points="0,-16 10,4 -10,4"
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {/* 内部 + 号 */}
      <line x1={0} y1={-10} x2={0} y2={0} stroke={style.stroke} strokeWidth={1} />
      <line x1={-5} y1={-5} x2={5} y2={-5} stroke={style.stroke} strokeWidth={1} />
      {/* 下方引脚线 */}
      <line x1={0} y1={4} x2={0} y2={20} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      {/* 标签 */}
      <text x={0} y={-22} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && <text x={0} y={-32} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">{sublabel}</text>}
    </>
  );
}
