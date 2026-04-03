import { forwardRef, useState, useCallback, useRef } from 'react';
import type { CircuitData, LayerConfig, NodePosition, StyleConfig } from '../types';
import { LAYOUT, computeLayerYPositions } from '../layout/computePositions';
import { routeWires } from '../layout/wireRouter';
import { resolveNodeStyle, resolveWireStyle } from '../styles/defaultStyles';
import { WirePath } from './WirePath';
import { DragContainer } from './DragContainer';

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
  onPointerDown: (e: React.PointerEvent, nodeId: string, pos: NodePosition) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onLayerReorder?: (layers: LayerConfig[]) => void;
}

export const CircuitSvg = forwardRef<SVGSVGElement, Props>(
  ({ data, positions, styleConfig, layers, onPointerDown, onPointerMove, onPointerUp, onLayerReorder }, ref) => {
    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const routed = routeWires(data.wires, positions, nodeMap);
    const layerYMap = computeLayerYPositions(layers);
    const internalSvgRef = useRef<SVGSVGElement | null>(null);

    // Layer drag state
    const [layerDrag, setLayerDrag] = useState<LayerDragState | null>(null);

    // Wire hover state
    const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

    // Compute separator Y positions (midpoint between consecutive layers)
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

    // Compute target insert index based on current drag Y
    const getInsertIndex = useCallback((dragLayerId: string, svgY: number): number => {
      const yPositions = layers.map(l => layerYMap.get(l.id)!);
      const fromIdx = layers.findIndex(l => l.id === dragLayerId);

      // Find the target index by checking which gap the cursor is in
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

    const handleLayerPointerUp = useCallback((e: React.PointerEvent) => {
      if (!layerDrag || !onLayerReorder) {
        setLayerDrag(null);
        return;
      }
      e.stopPropagation();
      const targetIdx = getInsertIndex(layerDrag.layerId, layerDrag.currentY);
      const fromIdx = layers.findIndex(l => l.id === layerDrag.layerId);

      if (fromIdx !== -1 && fromIdx !== targetIdx) {
        const newLayers = [...layers];
        const [removed] = newLayers.splice(fromIdx, 1);
        newLayers.splice(targetIdx, 0, removed);
        onLayerReorder(newLayers);
      }
      setLayerDrag(null);
    }, [layerDrag, onLayerReorder, layers, getInsertIndex]);

    // Compute drag visual offset and insert indicator
    let dragOffsetY = 0;
    let insertIndicatorY: number | null = null;
    if (layerDrag) {
      dragOffsetY = layerDrag.currentY - layerDrag.startY;
      const targetIdx = getInsertIndex(layerDrag.layerId, layerDrag.currentY);
      const yPositions = layers.map(l => layerYMap.get(l.id)!);
      // Show indicator line at the target position
      if (targetIdx === 0) {
        insertIndicatorY = yPositions[0] - 20;
      } else if (targetIdx >= yPositions.length - 1) {
        insertIndicatorY = yPositions[yPositions.length - 1] + 20;
      } else {
        insertIndicatorY = (yPositions[targetIdx] + yPositions[targetIdx - 1]) / 2;
      }
      // Don't show indicator if not actually moving
      const fromIdx = layers.findIndex(l => l.id === layerDrag.layerId);
      if (fromIdx === targetIdx) insertIndicatorY = null;
    }

    return (
      <svg
        ref={(node) => {
          internalSvgRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<SVGSVGElement | null>).current = node;
        }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${LAYOUT.width} ${LAYOUT.height}`}
        width={LAYOUT.width}
        height={LAYOUT.height}
        style={{
          background: 'white',
          fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
          cursor: layerDrag ? 'grabbing' : undefined,
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* 标题 */}
        <text x={LAYOUT.width / 2} y={28} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#1a202c">
          {data.title}
        </text>

        {/* 层级标签 */}
        {layers.map((layer) => {
          const y = layerYMap.get(layer.id);
          if (y == null) return null;
          const isDragging = layerDrag?.layerId === layer.id;
          const labelY = isDragging ? y + dragOffsetY : y;
          return (
            <g
              key={layer.id}
              style={{ cursor: onLayerReorder ? (isDragging ? 'grabbing' : 'grab') : undefined }}
              opacity={isDragging ? 0.6 : 1}
              onPointerDown={(e) => handleLayerPointerDown(e, layer.id)}
              onPointerMove={handleLayerPointerMove}
              onPointerUp={handleLayerPointerUp}
            >
              <rect
                x={0}
                y={labelY - 30}
                width={30}
                height={60}
                fill="transparent"
              />
              <text
                x={16}
                y={labelY + 4}
                fontSize={9}
                fill={isDragging ? '#3182ce' : '#999'}
                transform={`rotate(-90, 16, ${labelY})`}
                pointerEvents="none"
              >
                {layer.label}
              </text>
            </g>
          );
        })}

        {/* 拖拽插入指示线 */}
        {insertIndicatorY != null && (
          <line
            x1={0}
            y1={insertIndicatorY}
            x2={40}
            y2={insertIndicatorY}
            stroke="#3182ce"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

        {/* 层级分隔线 */}
        {separators.map((y) => (
          <line key={y} x1={40} y1={y} x2={LAYOUT.width - 20} y2={y} stroke="#eee" strokeWidth={1} strokeDasharray="4" />
        ))}

        {/* 导线 */}
        <g id="wires">
          {routed.map((r) => {
            const ws = resolveWireStyle(r.wire.id, r.wire.color, r.wire.gauge, styleConfig);
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
                dimmed={hoveredWireId != null && hoveredWireId !== r.wire.id}
                onHover={setHoveredWireId}
              />
            );
          })}
        </g>

        {/* 节点 */}
        <g id="nodes">
          {data.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const ns = resolveNodeStyle(node.id, node.type, styleConfig);
            return (
              <DragContainer
                key={node.id}
                node={node}
                pos={pos}
                style={ns}
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
