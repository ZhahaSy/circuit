import type { NodeStyleConfig } from '../../types';
import type { PinInfo } from '../DragContainer';

interface Props {
  label: string;
  sublabel?: string;
  style: Required<NodeStyleConfig>;
  pins?: string[];
  pinInfo?: PinInfo[];
}

/**
 * ECU/模块 — 灰色填充矩形块体，带黑色边框
 * 引脚线只在实际连线方向绘制（上方来线画上引脚，下方来线画下引脚）
 */
export function EcuNode({ label, sublabel, style, pinInfo }: Props) {
  const items = pinInfo && pinInfo.length > 0 ? pinInfo : [{ xOffset: 0, side: 'bottom' as const }];

  // 单针脚模式：不画矩形，只显示名称和针脚信息
  if (items.length === 1) {
    const p = items[0];
    const isTop = p.side === 'top';
    const px = p.xOffset;
    // 针脚线与 wireRouter port offset 一致（±38）
    const lineY1 = isTop ? -38 : 38;
    const lineY2 = 0;
    // 文字在针脚线的另一侧
    const textY = isTop ? 14 : -6;
    const pinLabelY = isTop ? -26 : 30;
    return (
      <>
        <line x1={px} y1={lineY2} x2={px} y2={lineY1} stroke="#333" strokeWidth={1.5} />
        <text x={px} y={textY} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>
          {label}
        </text>
        {sublabel && (
          <text x={px} y={textY + 12} textAnchor="middle" fontSize={8} fill="#333">{sublabel}</text>
        )}
        {p.label && (
          <text x={px + 4} y={pinLabelY} textAnchor="start" fontSize={7} fill="#555">{p.label}</text>
        )}
      </>
    );
  }

  // Auto-size rect to cover all pin positions
  const allX = items.map(p => p.xOffset);
  const minOff = Math.min(0, ...allX);
  const maxOff = Math.max(0, ...allX);
  const halfW = Math.max(50, Math.max(Math.abs(minOff), Math.abs(maxOff)) + 16);
  return (
    <>
      <rect
        x={-halfW}
        y={-24}
        width={halfW * 2}
        height={48}
        rx={0}
        fill="#ccc"
        stroke="#000"
        strokeWidth={0.5}
      />
      <text x={0} y={0} textAnchor="middle" fontSize={style.fontSize} fontWeight="bold" fill={style.textColor}>{label}</text>
      {sublabel && <text x={0} y={14} textAnchor="middle" fontSize={8} fill="#333">{sublabel}</text>}
      {items.map((p, i) => (
        <g key={i}>
          {p.side === 'top' && <line x1={p.xOffset} y1={-24} x2={p.xOffset} y2={-38} stroke="#333" strokeWidth={1.5} />}
          {p.side === 'bottom' && <line x1={p.xOffset} y1={24} x2={p.xOffset} y2={38} stroke="#333" strokeWidth={1.5} />}
          {p.label && (
            <text
              x={p.xOffset + 4}
              y={p.side === 'top' ? -30 : 34}
              textAnchor="start"
              fontSize={7}
              fill="#555"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </>
  );
}
