import { useState, useCallback, useRef } from 'react';
import type { CircuitData, LayerConfig, LayoutRuleConfig, NodePosition } from '../types';
import { computePositions, type LayoutResult } from '../layout/computePositions';

export function usePositions(
  data: CircuitData,
  layers?: LayerConfig[],
  layoutRules?: LayoutRuleConfig,
) {
  // Use refs to avoid resetPositions identity changing on every render
  const dataRef = useRef(data);
  const layersRef = useRef(layers);
  const layoutRulesRef = useRef(layoutRules);
  dataRef.current = data;
  layersRef.current = layers;
  layoutRulesRef.current = layoutRules;

  const [layoutResult, setLayoutResult] = useState<LayoutResult>(() =>
    computePositions(data, layers, layoutRules),
  );

  const updatePosition = useCallback((nodeId: string, pos: NodePosition) => {
    setLayoutResult(prev => {
      const next = new Map(prev.positions);
      next.set(nodeId, pos);
      return { ...prev, positions: next };
    });
  }, []);

  const resetPositions = useCallback(() => {
    setLayoutResult(computePositions(dataRef.current, layersRef.current, layoutRulesRef.current));
  }, []);

  return {
    positions: layoutResult.positions,
    powerBuses: layoutResult.powerBuses,
    busBarTopY: layoutResult.busBarTopY,
    updatePosition,
    resetPositions,
  };
}
