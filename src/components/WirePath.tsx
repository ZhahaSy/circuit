import type { RoutedWire } from '../layout/wireRouter';

interface Props {
  routed: RoutedWire;
  color: string;
  strokeWidth: number;
  dashArray?: string;
  opacity: number;
  secondaryColor?: string;
  separatorYs?: number[];
  dimmed?: boolean;
  onHover?: (wireId: string | null) => void;
}

/** Compute intersection points between a polyline path and horizontal separator lines */
function computeCrossings(path: string, separatorYs: number[]): { x: number; y: number }[] {
  const points = parsePath(path);
  const crossings: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    for (const sy of separatorYs) {
      if (sy > minY && sy < maxY) {
        const t = (sy - a.y) / (b.y - a.y);
        crossings.push({ x: a.x + t * (b.x - a.x), y: sy });
      }
    }
  }
  return crossings;
}

function parsePath(path: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const parts = path.split(/\s*[ML]\s*/).filter(Boolean);
  for (const part of parts) {
    const [xStr, yStr] = part.trim().split(/\s+/);
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
  }
  return points;
}

export function WirePath({ routed, color, strokeWidth, dashArray, opacity, secondaryColor, separatorYs, dimmed, onHover }: Props) {
  const { wire, path, labelX, labelY } = routed;

  const pathPoints = parsePath(path);
  const startPt = pathPoints[0];
  const endPt = pathPoints[pathPoints.length - 1];

  const crossings = separatorYs ? computeCrossings(path, separatorYs) : [];
  const effectiveOpacity = dimmed ? 0.15 : opacity;

  return (
    <g
      onPointerEnter={() => onHover?.(wire.id)}
      onPointerLeave={() => onHover?.(null)}
      style={{ transition: 'opacity 0.15s' }}
      opacity={effectiveOpacity}
    >
      {/* 透明宽路径扩大 hover 区域 */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth, 8)}
      />
      {/* 主色底层 */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
      />
      {/* 双色：副色中间条纹 */}
      {secondaryColor && (
        <path
          d={path}
          fill="none"
          stroke={secondaryColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* 端点圆点 */}
      {startPt && <circle cx={startPt.x} cy={startPt.y} r={2.5} fill={color} />}
      {endPt && <circle cx={endPt.x} cy={endPt.y} r={2.5} fill={color} />}
      {/* 跨层穿越点 */}
      {crossings.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="white" stroke={color} strokeWidth={1.5} />
      ))}
      <text x={labelX} y={labelY} fontSize={8} fill="#1a202c">
        {wire.color} {wire.gauge}mm²
      </text>
    </g>
  );
}
