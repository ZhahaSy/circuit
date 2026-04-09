import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  pins?: string[];
  style: Required<NodeStyleConfig>;
}

/**
 * 对接插头 — 参考无线充电系统电路图标准符号
 * 圆形端子 + 中心引脚标记（从原始 SVG 提取并归一化到原点）
 */
export function ConnectorPlugNode({ label, sublabel, style }: Props) {
  return (
    <g>
      {/* 白色背景 */}
      <rect x={-5} y={-10} width={10} height={20} fill="#fff" stroke="none" />

      {/* 上方引脚线 */}
      <line x1={0} y1={-10} x2={0} y2={-24} fill="none" stroke="#000" strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />
      {/* 下方引脚线 */}
      <line x1={0} y1={10} x2={0} y2={24} fill="none" stroke="#000" strokeWidth={0.6} strokeLinecap="round" />

      {/* 圆形端子（外圈 + 内圈） */}
      <circle cx={0} cy={0} r={4} fill="#fff" stroke="#000" strokeWidth={0.8} />
      <circle cx={0} cy={0} r={3.2} fill="none" stroke="#000" strokeWidth={0.6} />

      {/* 中心引脚标记（小矩形） */}
      <rect x={-0.6} y={-2.5} width={1.2} height={5} fill="#000" stroke="#000" strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* 标签 */}
      <text
        x={10}
        y={-2}
        textAnchor="start"
        fontSize={style.fontSize}
        fontWeight="bold"
        fill={style.textColor}
      >
        {label}
      </text>
      {sublabel && (
        <text x={10} y={10} textAnchor="start" fontSize={8} fill="#999">
          {sublabel}
        </text>
      )}
    </g>
  );
}
