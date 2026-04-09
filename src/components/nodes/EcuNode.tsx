import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * ECU/模块 — 参考无线充电系统电路图标准符号
 * 灰色填充矩形块体，带黑色边框
 */
export function EcuNode({ label, sublabel, style }: Props) {
  return (
    <>
      <rect
        x={-50}
        y={-24}
        width={100}
        height={48}
        rx={0}
        fill="#ccc"
        stroke="#000"
        strokeWidth={0.5}
      />
      <text x={0} y={0} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && <text x={0} y={14} textAnchor="middle" fontSize={8} fill="#333">{sublabel}</text>}
      <line x1={0} y1={-24} x2={0} y2={-38} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={24} x2={0} y2={38} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
