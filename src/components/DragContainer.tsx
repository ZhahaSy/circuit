import type { CircuitNode, NodePosition, NodeStyleConfig } from '../types';
import { PowerNode } from './nodes/PowerNode';
import { GroundNode } from './nodes/GroundNode';
import { FuseNode } from './nodes/FuseNode';
import { ConnectorNode } from './nodes/ConnectorNode';
import { SpliceNode } from './nodes/SpliceNode';
import { EcuNode } from './nodes/EcuNode';
import { SwitchNode } from './nodes/SwitchNode';
import { RelayNode } from './nodes/RelayNode';
import { ConnectorPlugNode } from './nodes/ConnectorPlugNode';
import { CustomSvgNode } from './nodes/CustomSvgNode';

interface Props {
  node: CircuitNode;
  pos: NodePosition;
  style: Required<NodeStyleConfig>;
  onPointerDown: (e: React.PointerEvent, nodeId: string, pos: NodePosition) => void;
}

export function DragContainer({ node, pos, style, onPointerDown }: Props) {
  const handlePointerDown = (e: React.PointerEvent) => {
    onPointerDown(e, node.id, pos);
  };

  const renderInner = () => {
    if (node.customSvg) {
      return <CustomSvgNode dataUrl={node.customSvg} label={node.label} />;
    }
    switch (node.type) {
      case 'power':
        return <PowerNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'ground':
        return <GroundNode label={node.label} style={style} />;
      case 'fuse':
        return <FuseNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'connector':
        return <ConnectorNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'connector_plug':
        return <ConnectorPlugNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'splice':
        return <SpliceNode label={node.label} style={style} />;
      case 'ecu':
        return <EcuNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'switch':
        return <SwitchNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'relay':
        return <RelayNode label={node.label} sublabel={node.sublabel} style={style} />;
      default:
        return (
          <>
            <rect x={-30} y={-15} width={60} height={30} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
            <text x={0} y={4} textAnchor="middle" fontSize={style.fontSize} fill={style.textColor}>{node.label}</text>
          </>
        );
    }
  };

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      onPointerDown={handlePointerDown}
      style={{ cursor: 'grab' }}
    >
      {renderInner()}
    </g>
  );
}
