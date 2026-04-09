import type { RoutedWire } from '../layout/wireRouter';
import type { WireRuleConfig } from '../types';
import { formatWireLabel } from '../styles/defaultStyles';

export interface FuseBoxBound {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  children: Set<string>;
}

interface Props {
  routed: RoutedWire;
  color: string;
  strokeWidth: number;
  dashArray?: string;
  opacity: number;
  secondaryColor?: string;
  secondaryWidth?: number;
  separatorYs?: number[];
  dimmed?: boolean;
  onHover?: (wireId: string | null) => void;
  wireRules?: WireRuleConfig;
  fuseBoxBounds?: FuseBoxBound[];
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

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function isInsideBox(pt: { x: number; y: number }, box: FuseBoxBound): boolean {
  return pt.x >= box.minX && pt.x <= box.maxX && pt.y >= box.minY && pt.y <= box.maxY;
}

/** Find intersection of segment (a→b) with the axis-aligned box boundary. Returns the crossing point closest to a. */
function segmentBoxIntersection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: FuseBoxBound,
): { x: number; y: number } | null {
  const edges: { axis: 'x' | 'y'; value: number }[] = [
    { axis: 'x', value: box.minX },
    { axis: 'x', value: box.maxX },
    { axis: 'y', value: box.minY },
    { axis: 'y', value: box.maxY },
  ];
  let bestT = Infinity;
  let bestPt: { x: number; y: number } | null = null;
  for (const edge of edges) {
    if (edge.axis === 'x') {
      const dx = b.x - a.x;
      if (Math.abs(dx) < 0.001) continue;
      const t = (edge.value - a.x) / dx;
      if (t > 0.001 && t < 0.999) {
        const iy = a.y + t * (b.y - a.y);
        if (iy >= box.minY && iy <= box.maxY && t < bestT) {
          bestT = t;
          bestPt = { x: edge.value, y: iy };
        }
      }
    } else {
      const dy = b.y - a.y;
      if (Math.abs(dy) < 0.001) continue;
      const t = (edge.value - a.y) / dy;
      if (t > 0.001 && t < 0.999) {
        const ix = a.x + t * (b.x - a.x);
        if (ix >= box.minX && ix <= box.maxX && t < bestT) {
          bestT = t;
          bestPt = { x: ix, y: edge.value };
        }
      }
    }
  }
  return bestPt;
}

/**
 * Split path points into inside-box and outside-box segments.
 * Returns { insidePath, outsidePath } as SVG path strings.
 */
function splitPathAtBox(
  points: { x: number; y: number }[],
  box: FuseBoxBound,
): { insidePath: string; outsidePath: string } {
  if (points.length < 2) {
    return { insidePath: '', outsidePath: pointsToPath(points) };
  }

  const insidePoints: { x: number; y: number }[][] = [];
  const outsidePoints: { x: number; y: number }[][] = [];

  let currentInside = isInsideBox(points[0], box);
  let currentSegment: { x: number; y: number }[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const ptInside = isInsideBox(points[i], box);
    if (ptInside === currentInside) {
      currentSegment.push(points[i]);
    } else {
      // Transition: find intersection
      const crossPt = segmentBoxIntersection(points[i - 1], points[i], box);
      if (crossPt) {
        currentSegment.push(crossPt);
        (currentInside ? insidePoints : outsidePoints).push(currentSegment);
        currentSegment = [crossPt, points[i]];
      } else {
        currentSegment.push(points[i]);
      }
      currentInside = ptInside;
    }
  }
  (currentInside ? insidePoints : outsidePoints).push(currentSegment);

  return {
    insidePath: insidePoints.map(pointsToPath).join(' '),
    outsidePath: outsidePoints.map(pointsToPath).join(' '),
  };
}

/** Compute the geometric midpoint along a polyline path */
function pathMidpoint(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  // Compute total length
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }

  // Walk to half length
  const halfLen = totalLen / 2;
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (walked + segLen >= halfLen) {
      const t = segLen > 0 ? (halfLen - walked) / segLen : 0;
      return { x: points[i - 1].x + t * dx, y: points[i - 1].y + t * dy };
    }
    walked += segLen;
  }
  return points[points.length - 1];
}

export function WirePath({ routed, color, strokeWidth, dashArray, opacity, secondaryColor, secondaryWidth, separatorYs: _separatorYs, dimmed, onHover, wireRules, fuseBoxBounds }: Props) {
  const { wire, path } = routed;

  const pathPoints = parsePath(path);

  const effectiveOpacity = dimmed ? 0.15 : opacity;
  const labelVisible = wireRules?.labelVisible ?? true;
  const secWidth = secondaryWidth ?? wireRules?.secondaryWidth ?? 1.5;
  const hasColorInfo = !!(wire.color || wire.gauge != null);
  const labelText = hasColorInfo ? formatWireLabel(wire.color || '', wire.gauge ?? 0, wireRules) : '';
  const mid = pathMidpoint(pathPoints);

  // Check if either endpoint's node is inside a fuseBox
  const relevantBox = fuseBoxBounds?.find(
    box => box.children.has(wire.from.nodeId) || box.children.has(wire.to.nodeId),
  );

  if (relevantBox && pathPoints.length >= 2) {
    const { insidePath, outsidePath } = splitPathAtBox(pathPoints, relevantBox);

    return (
      <g
        onPointerEnter={() => onHover?.(wire.id)}
        onPointerLeave={() => onHover?.(null)}
        style={{ transition: 'opacity 0.15s' }}
        opacity={effectiveOpacity}
      >
        {/* Hit area */}
        <path d={path} fill="none" stroke="transparent" strokeWidth={Math.max(strokeWidth, 8)} />
        {/* Inside fuseBox: 1px black */}
        {insidePath && (
          <path
            d={insidePath}
            fill="none"
            stroke="#333"
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Outside fuseBox: normal style */}
        {outsidePath && (
          <>
            <path
              d={outsidePath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashArray}
            />
            {secondaryColor && (
              <path
                d={outsidePath}
                fill="none"
                stroke={secondaryColor}
                strokeWidth={secWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
        {labelVisible && labelText && (
          <g>
            <rect x={mid.x - labelText.length * 2.5 - 2} y={mid.y - 7} width={labelText.length * 5 + 4} height={12} rx={2} fill="white" />
            <text x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize={8} fill="#1a202c">{labelText}</text>
          </g>
        )}
      </g>
    );
  }

  // Default rendering (no fuseBox involvement)
  return (
    <g
      onPointerEnter={() => onHover?.(wire.id)}
      onPointerLeave={() => onHover?.(null)}
      style={{ transition: 'opacity 0.15s' }}
      opacity={effectiveOpacity}
    >
      <path d={path} fill="none" stroke="transparent" strokeWidth={Math.max(strokeWidth, 8)} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
      />
      {secondaryColor && (
        <path
          d={path}
          fill="none"
          stroke={secondaryColor}
          strokeWidth={secWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {labelVisible && labelText && (
        <g>
          <rect x={mid.x - labelText.length * 2.5 - 2} y={mid.y - 7} width={labelText.length * 5 + 4} height={12} rx={2} fill="white" />
          <text x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize={8} fill="#1a202c">{labelText}</text>
        </g>
      )}
    </g>
  );
}
