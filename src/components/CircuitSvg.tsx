import { forwardRef, useState, useCallback, useRef } from 'react';
import type { CircuitData, LayerConfig, NodePosition, StyleConfig, WireRuleConfig, FuseBoxConfig, PinRuleConfig } from '../types';
import type { PowerBusInfo } from '../layout/computePositions';
import { LAYOUT, computeLayerYPositions } from '../layout/computePositions';
import { routeWires } from '../layout/wireRouter';
import { resolveNodeStyle, resolveWireStyle } from '../styles/defaultStyles';
import { WirePath } from './WirePath';
import { DragContainer } from './DragContainer';
import { PowerBusBar } from './PowerBusBar';

interface LayerDragState {
  layerId: string;
  startY: number;
  currentY: number;
}

interface Props {
  data: CircuitData;
  positions: Map<string, NodePosition>;
  styleConfig: StyleConfig;
  layers: LayerConfig[];
  wireRules?: WireRuleConfig;
  pinRules?: PinRuleConfig;
  powerBuses?: PowerBusInfo[];
  busBarTopY?: number;
  onPointerDown: (e: React.PointerEvent, nodeId: string, pos: NodePosition) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onLayerReorder?: (layers: LayerConfig[]) => void;
}

export const CircuitSvg = forwardRef<SVGSVGElement, Props>(
  ({ data, positions, styleConfig, layers, wireRules, pinRules, powerBuses, busBarTopY, onPointerDown, onPointerMove, onPointerUp, onLayerReorder }, ref) => {
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const routed = routeWires(data.wires, positions, nodeMap);
    const layerYMap = computeLayerYPositions(layers);
    const internalSvgRef = useRef<SVGSVGElement | null>(null);

    const [layerDrag, setLayerDrag] = useState<LayerDragState | null>(null);
    const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

    // Power node IDs (rendered as bus bar, not as individual nodes)
    const powerNodeIds = new Set(
      data.nodes.filter(n => n.type === 'power').map(n => n.id),
    );

    const separators: number[] = [];
    const layerEntries = layers.map(l => layerYMap.get(l.id)!);
    for (let i = 1; i < layerEntries.length; i++) {
      separators.push((layerEntries[i - 1] + layerEntries[i]) / 2);
    }

    const toSvgY = useCallback((clientY: number): number | null => {
      const svg = internalSvgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return (clientY - ctm.f) / ctm.d;
    }, []);

    const getInsertIndex = useCallback((_dragLayerId: string, svgY: number): number => {
      const yPositions = layers.map(l => layerYMap.get(l.id)!);
      for (let i = 0; i < yPositions.length - 1; i++) {
        const mid = (yPositions[i] + yPositions[i + 1]) / 2;
        if (svgY < mid) return i;
      }
      return yPositions.length - 1;
    }, [layers, layerYMap]);

    const handleLayerPointerDown = useCallback((e: React.PointerEvent, layerId: string) => {
      if (!onLayerReorder) return;
      e.stopPropagation();
      e.preventDefault();
      const svgY = toSvgY(e.clientY);
      if (svgY == null) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      setLayerDrag({ layerId, startY: svgY, currentY: svgY });
    }, [onLayerReorder, toSvgY]);

    const handleLayerPointerMove = useCallback((e: React.PointerEvent) => {
      if (!layerDrag) return;
      e.stopPropagation();
      const svgY = toSvgY(e.clientY);
      if (svgY == null) return;
      setLayerDrag(prev => prev ? { ...prev, currentY: svgY } : null);
    }, [layerDrag, toSvgY]);

    const handleLayerPointerUp = useCallback(() => {
      if (!layerDrag || !onLayerReorder) {
        setLayerDrag(null);
        return;
      }
      const fromIdx = layers.findIndex(l => l.id === layerDrag.layerId);
      const toIdx = getInsertIndex(layerDrag.layerId, layerDrag.currentY);
      if (fromIdx !== -1 && fromIdx !== toIdx) {
        const next = [...layers];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        onLayerReorder(next);
      }
      setLayerDrag(null);
    }, [layerDrag, layers, onLayerReorder, getInsertIndex]);

    // Collect bus dots from routed wires
    const busDots = routed
      .filter(r => r.busDot)
      .map(r => r.busDot!);

    return (
      <svg
        ref={(el) => {
          internalSvgRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        viewBox={`0 0 ${LAYOUT.width} ${LAYOUT.height}`}
        width="100%"
        height="100%"
        style={{ background: '#fff', borderRadius: 8 }}
        onPointerMove={(e) => {
          handleLayerPointerMove(e);
          onPointerMove(e);
        }}
        onPointerUp={() => {
          handleLayerPointerUp();
          onPointerUp();
        }}
      >
        {/* 标题 */}
        <text x={LAYOUT.width / 2} y={24} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#2d3748">
          {data.title}
        </text>
        <text x={LAYOUT.width / 2} y={40} textAnchor="middle" fontSize={10} fill="#718096">
          {data.systemName}
        </text>

        {/* 电源母线区域 */}
        {powerBuses && powerBuses.length > 0 && (
          <PowerBusBar
            buses={powerBuses.map(b => ({ id: b.id, label: b.label }))}
            y={busBarTopY ?? LAYOUT.topMargin}
          />
        )}

        {/* 层级分隔线 & 标签 (non-power layers only) */}
        {separators.map((sy, i) => (
          <line key={`sep-${i}`} x1={0} y1={sy} x2={LAYOUT.width} y2={sy} stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="4 4" />
        ))}
        {layers.map((layer) => {
          const ly = layerYMap.get(layer.id);
          if (ly == null) return null;
          const dragOffset = layerDrag?.layerId === layer.id ? layerDrag.currentY - layerDrag.startY : 0;
          return (
            <text
              key={layer.id}
              x={12}
              y={ly + dragOffset + 4}
              fontSize={9}
              fill={layerDrag?.layerId === layer.id ? '#3182ce' : '#a0aec0'}
              fontWeight={layerDrag?.layerId === layer.id ? 'bold' : 'normal'}
              style={{ cursor: onLayerReorder ? 'grab' : 'default', userSelect: 'none' }}
              onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
            >
              {layer.label}
            </text>
          );
        })}

        {/* 保险丝盒 */}
        {(data.fuseBoxes ?? []).map((fb: FuseBoxConfig) => {
          const childPositions = fb.children.map(id => positions.get(id)).filter(Boolean) as NodePosition[];
          if (childPositions.length === 0) return null;
          const minX = Math.min(...childPositions.map(p => p.x)) - 50;
          const maxX = Math.max(...childPositions.map(p => p.x)) + 50;
          const minY = Math.min(...childPositions.map(p => p.y)) - 45;
          const maxY = Math.max(...childPositions.map(p => p.y)) + 45;
          return (
            <g key={fb.id}>
              <rect
                x={minX} y={minY}
                width={maxX - minX} height={maxY - minY}
                rx={8} fill="#f7fafc" stroke="#a0aec0" strokeWidth={2} strokeDasharray="6 3" opacity={0.8}
              />
              <text x={maxX + 8} y={(minY + maxY) / 2} fontSize={9} fill="#718096" fontWeight="bold" dominantBaseline="central">{fb.label}</text>
            </g>
          );
        })}

        {/* 连线 */}
        <g id="wires">
          {(() => {
            // 计算所有 fuseBox 的边界矩形
            const fuseBoxBounds = (data.fuseBoxes ?? []).map(fb => {
              const childPositions = fb.children.map(id => positions.get(id)).filter(Boolean) as NodePosition[];
              if (childPositions.length === 0) return null;
              return {
                minX: Math.min(...childPositions.map(p => p.x)) - 50,
                maxX: Math.max(...childPositions.map(p => p.x)) + 50,
                minY: Math.min(...childPositions.map(p => p.y)) - 45,
                maxY: Math.max(...childPositions.map(p => p.y)) + 45,
                children: new Set(fb.children),
              };
            }).filter(Boolean) as { minX: number; maxX: number; minY: number; maxY: number; children: Set<string> }[];

            return routed.map((r) => {
              const ws = resolveWireStyle(r.wire.id, r.wire.color, r.wire.gauge, styleConfig, wireRules);
              const isHovered = hoveredWireId === r.wire.id;
              const dimmed = hoveredWireId !== null && !isHovered;
              return (
                <WirePath
                  key={r.wire.id}
                  routed={r}
                  color={ws.color}
                  strokeWidth={ws.strokeWidth}
                  dashArray={ws.dashArray}
                  opacity={ws.opacity}
                  secondaryColor={ws.secondaryColor}
                  separatorYs={separators}
                  dimmed={dimmed}
                  onHover={(id) => setHoveredWireId(id)}
                  wireRules={wireRules}
                  fuseBoxBounds={fuseBoxBounds}
                />
              );
            });
          })()}
        </g>

        {/* 母线连接点（圆点） */}
        {busDots.map((dot, i) => (
          <circle
            key={`bus-dot-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={3}
            fill="#975A16"
            stroke="#B7791F"
            strokeWidth={0.5}
          />
        ))}

        {/* 节点 (skip power nodes — they're rendered as bus bar) */}
        <g id="nodes">
          {data.nodes.map((node) => {
            if (powerNodeIds.has(node.id)) return null;
            const pos = positions.get(node.id);
            if (!pos) return null;
            const ns = resolveNodeStyle(node.id, node.type, styleConfig);
            return (
              <DragContainer
                key={node.id}
                node={node}
                pos={pos}
                style={ns}
                pinRules={pinRules}
                onPointerDown={onPointerDown}
              />
            );
          })}
        </g>
      </svg>
    );
  },
);

CircuitSvg.displayName = 'CircuitSvg';
