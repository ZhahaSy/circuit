import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 连接器 — 对接插头造型（母端）
 * 用半圆凹槽表示插口，区别于普通方块元件
 */
export function ConnectorNode({ label, sublabel, style }: Props) {
  return (
    <>
      {/* 插座主体：带凹槽的矩形 */}
      <path
        d="M -30 -18 L 30 -18 L 30 18 L -30 18 Z"
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {/* 上方凹槽（母端插口） */}
      <path
        d="M -14 -18 L -14 -10 A 14 14 0 0 0 14 -10 L 14 -18"
        fill="#fff"
        stroke={style.stroke}
        strokeWidth={1}
      />
      {/* 针脚孔位 */}
      <circle cx={-8} cy={-6} r={2} fill={style.stroke} />
      <circle cx={0} cy={-6} r={2} fill={style.stroke} />
      <circle cx={8} cy={-6} r={2} fill={style.stroke} />
      {/* 标签 */}
      <text x={0} y={12} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>
        {label}
      </text>
      {sublabel && (
        <text x={0} y={-26} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">
          {sublabel}
        </text>
      )}
      {/* 上下连接线 */}
      <line x1={0} y1={-18} x2={0} y2={-32} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={18} x2={0} y2={32} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
