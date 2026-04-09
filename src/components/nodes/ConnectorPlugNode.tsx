import type { NodeStyleConfig } from '../../types';
import type { PinInfo } from '../DragContainer';

interface Props {
  label: string;
  style: Required<NodeStyleConfig>;
  pinInfo?: PinInfo[];
}

/**
 * 对接插头 — 参考原始电路图 SVG 标准符号
 * 双圆环 + 上半遮罩（表示插头开口） + 中心引脚竖条
 */
export function ConnectorPlugNode({ label, style, pinInfo }: Props) {
  const items = pinInfo && pinInfo.length > 0 ? pinInfo : [{ xOffset: 0, side: 'bottom' as const }];
  return (
    <g>
      {items.map((p, i) => {
        const x = p.xOffset;
        return (
          <g key={i}>
            {/* 上方引脚线（对接插头是直通器件，始终渲染双向引脚线） */}
            <line x1={x} y1={-8.25} x2={x} y2={-24} fill="none" stroke="#000" strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />
            {/* 下方引脚线 */}
            <line x1={x} y1={3.15} x2={x} y2={24} fill="none" stroke="#000" strokeWidth={0.6} strokeLinecap="round" />
            {/* 外圈 + 内圈 */}
            <circle cx={x} cy={-2.83} r={3.81} fill="#fff" stroke="#000" strokeWidth={0.64} />
            <circle cx={x} cy={-2.83} r={3.17} fill="none" stroke="#000" strokeWidth={0.6} />
            {/* 上半遮罩（白色矩形盖住上半圆，形成插头开口） */}
            <rect x={x - 4.25} y={-7.2} width={8.5} height={4.06} fill="#fff" stroke="none" />
            {/* 中心引脚竖条 */}
            <rect x={x - 0.51} y={-6.31} width={1.02} height={4.19} fill="#000" stroke="#000" strokeWidth={0.72} strokeLinecap="round" strokeLinejoin="round" />
            {/* pin label */}
            {p.label && (
              <text x={x + 4} y={p.side === 'top' ? -16 : 18} textAnchor="start" fontSize={7} fill="#555">{p.label}</text>
            )}
          </g>
        );
      })}

    </g>
  );
}
