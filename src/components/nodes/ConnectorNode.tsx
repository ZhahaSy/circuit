import type { NodeStyleConfig } from '../../types';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
}

/**
 * 连接器 — 参考无线充电系统电路图标准符号
 * 矩形插座主体，带引脚编号标记
 */
export function ConnectorNode({ label, sublabel, style }: Props) {
  return (
    <>
      {/* 插座主体矩形 */}
      <rect
        x={-20}
        y={-14}
        width={40}
        height={28}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      {/* 引脚编号圆 */}
      <circle cx={0} cy={-14} r={3.5} fill={style.stroke} stroke="#fff" strokeWidth={0.8} />
      <text x={0} y={-12} textAnchor="middle" fontSize={5} fill="#fff" fontWeight="bold">P</text>

      {/* 标签 */}
      <text x={0} y={4} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>
        {label}
      </text>
      {sublabel && (
        <text x={0} y={-22} textAnchor="middle" fontSize={style.fontSize - 2} fill="#666">
          {sublabel}
        </text>
      )}
      {/* 上下连接线 */}
      <line x1={0} y1={-14} x2={0} y2={-28} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={14} x2={0} y2={28} stroke="#333" strokeWidth={1.5} />
    </>
  );
}
