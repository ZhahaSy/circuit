import { useCallback, useRef } from 'react';
import type { NodePosition } from '../types';

interface UseNodeDragOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  onDrag: (nodeId: string, pos: NodePosition) => void;
}

export function useNodeDrag({ svgRef, onDrag }: UseNodeDragOptions) {
  const dragging = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const toSvgCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return {
      x: (clientX - ctm.e) / ctm.a,
      y: (clientY - ctm.f) / ctm.d,
    };
  }, [svgRef]);

  const onPointerDown = useCallback((e: React.PointerEvent, nodeId: string, currentPos: NodePosition) => {
    const svgPt = toSvgCoords(e.clientX, e.clientY);
    if (!svgPt) return;
    dragging.current = {
      nodeId,
      offsetX: svgPt.x - currentPos.x,
      offsetY: svgPt.y - currentPos.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [toSvgCoords]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const svgPt = toSvgCoords(e.clientX, e.clientY);
    if (!svgPt) return;
    onDrag(dragging.current.nodeId, {
      x: svgPt.x - dragging.current.offsetX,
      y: svgPt.y - dragging.current.offsetY,
    });
  }, [toSvgCoords, onDrag]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
