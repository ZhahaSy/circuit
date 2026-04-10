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

    // Compute pin info per node: X offset (relative to center) + direction (top/bottom) + label
    // For connector_plug: if pass-through (peers on both sides), align to downstream peer
    const plugPinPeers = new Map<string, { peerX: number; side: 'top' | 'bottom' }[]>();
    const pinInfoMap = new Map<string, { xOffset: number; side: 'top' | 'bottom'; label?: string }[]>();
    const seenPinKeys = new Set<string>();

    // First pass: collect connector_plug pin peers
    for (const w of data.wires) {
      for (const [ep, peer] of [[w.from, w.to], [w.to, w.from]] as const) {
        if (!ep.pin) continue;
        const epNode = nodeMap.get(ep.nodeId);
        if (epNode?.type !== 'connector_plug') continue;
        const nodeCenter = positions.get(ep.nodeId);
        const peerCenter = positions.get(peer.nodeId);
        if (!nodeCenter || !peerCenter) continue;
        const key = `${ep.nodeId}:${ep.pin}`;
        const side: 'top' | 'bottom' = peerCenter.y < nodeCenter.y ? 'top' : 'bottom';
        if (!plugPinPeers.has(key)) plugPinPeers.set(key, []);
        plugPinPeers.get(key)!.push({ peerX: peerCenter.x, side });
      }
    }
    // Resolve connector_plug pin xOffset: pass-through → downstream peer; single-side → only peer
    const plugPinXOffset = new Map<string, number>();
    for (const [key, peers] of plugPinPeers) {
      const nodeId = key.split(':')[0];
      const nodeCenter = positions.get(nodeId);
      if (!nodeCenter) continue;
      const topPeers = peers.filter(p => p.side === 'top');
      const bottomPeers = peers.filter(p => p.side === 'bottom');
      if (topPeers.length > 0 && bottomPeers.length > 0) {
        plugPinXOffset.set(key, bottomPeers[0].peerX - nodeCenter.x);
      } else {
        plugPinXOffset.set(key, peers[0].peerX - nodeCenter.x);
      }
    }

    // Second pass: build pinInfoMap
    for (const w of data.wires) {
      for (const [ep, peer] of [[w.from, w.to], [w.to, w.from]] as const) {
        const pinKey = ep.pin ?? `__nopin_${peer.nodeId}`;
        const key = `${ep.nodeId}:${pinKey}`;
        if (seenPinKeys.has(key)) continue;
        seenPinKeys.add(key);
        const nodeCenter = positions.get(ep.nodeId);
        const peerCenter = positions.get(peer.nodeId);
        if (!nodeCenter || !peerCenter) continue;
        const epNode = nodeMap.get(ep.nodeId);
        const peerNode = nodeMap.get(peer.nodeId);
        let xOffset: number;
        if (epNode?.type === 'connector_plug' && ep.pin) {
          xOffset = plugPinXOffset.get(`${ep.nodeId}:${ep.pin}`) ?? 0;
        } else if (peerNode?.type === 'can' && peer.pin) {
          // CAN bus pins have fixed offsets: pin 0 = -5 (CAN-H), pin 1 = +5 (CAN-L)
          const canPinOffset = peer.pin === '0' ? -50 : peer.pin === '1' ? 50 : 0;
          xOffset = peerCenter.x + canPinOffset - nodeCenter.x;
        } else {
          xOffset = ep.pin ? peerCenter.x - nodeCenter.x : 0;
        }
        const side: 'top' | 'bottom' = peerCenter.y < nodeCenter.y ? 'top' : 'bottom';
        const label = ep.pin ? `${ep.nodeId}-${ep.pin}` : undefined;
        const peerIsCan = peerNode?.type === 'can';
        if (!pinInfoMap.has(ep.nodeId)) pinInfoMap.set(ep.nodeId, []);
        pinInfoMap.get(ep.nodeId)!.push({ xOffset, side, label, _canGroup: peerIsCan ? peer.nodeId : undefined });
      }
    }

    // Post-process: enforce min 100px spacing & keep CAN pins adjacent
    const MIN_PIN_SPACING = 100;
    for (const [_nodeId, pins] of pinInfoMap) {
      // Process each side independently
      for (const side of ['top', 'bottom'] as const) {
        const sidePins = pins.filter(p => p.side === side);
        if (sidePins.length < 2) continue;

        // Sort: CAN-grouped pins adjacent, then by original xOffset
        sidePins.sort((a, b) => {
          const aGroup = (a as any)._canGroup ?? '';
          const bGroup = (b as any)._canGroup ?? '';
          if (aGroup && aGroup === bGroup) return a.xOffset - b.xOffset;
          if (aGroup && !bGroup) return 1;
          if (!aGroup && bGroup) return -1;
          return a.xOffset - b.xOffset;
        });

        // Re-space with minimum gap
        const totalWidth = (sidePins.length - 1) * MIN_PIN_SPACING;
        const startX = -totalWidth / 2;
        for (let i = 0; i < sidePins.length; i++) {
          sidePins[i].xOffset = startX + i * MIN_PIN_SPACING;
        }
      }
    }

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
                pinInfo={pinInfoMap.get(node.id)}
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
