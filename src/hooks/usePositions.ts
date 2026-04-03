import { useState, useCallback } from 'react';
import type { CircuitData, LayerConfig, NodePosition } from '../types';
import { computePositions } from '../layout/computePositions';

export function usePositions(data: CircuitData, layers?: LayerConfig[]) {
  const [positions, setPositions] = useState<Map<string, NodePosition>>(() =>
    computePositions(data, layers),
  );

  const updatePosition = useCallback((nodeId: string, pos: NodePosition) => {
    setPositions(prev => {
      const next = new Map(prev);
      next.set(nodeId, pos);
      return next;
    });
  }, []);

  const resetPositions = useCallback(() => {
    setPositions(computePositions(data, layers));
  }, [data, layers]);

  return { positions, updatePosition, resetPositions };
}
