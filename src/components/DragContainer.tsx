import type { CircuitNode, NodePosition, NodeStyleConfig, PinRuleConfig } from '../types';
import { PowerNode } from './nodes/PowerNode';
import { GroundNode } from './nodes/GroundNode';
import { FuseNode } from './nodes/FuseNode';
import { ConnectorNode } from './nodes/ConnectorNode';
import { SpliceNode } from './nodes/SpliceNode';
import { EcuNode } from './nodes/EcuNode';
import { SwitchNode } from './nodes/SwitchNode';
import { RelayNode } from './nodes/RelayNode';
import { ConnectorPlugNode } from './nodes/ConnectorPlugNode';
import { CanBusNode } from './nodes/CanBusNode';
import { CustomSvgNode } from './nodes/CustomSvgNode';

export interface PinInfo {
  xOffset: number;
  side: 'top' | 'bottom';
  label?: string; // e.g. "IP25-1"
}

interface Props {
  node: CircuitNode;
  pos: NodePosition;
  style: Required<NodeStyleConfig>;
  pinRules?: PinRuleConfig;
  pinInfo?: PinInfo[];
  onPointerDown: (e: React.PointerEvent, nodeId: string, pos: NodePosition) => void;
}

// Node bounding box heights for pin placement
const NODE_HALF_HEIGHTS: Record<string, number> = {
  power: 20, ground: 20, fuse: 28, relay: 34, switch: 28,
  splice: 4, connector: 34, connector_plug: 24, ecu: 38,
  sensor: 24, actuator: 24, resistor: 20, capacitor: 20,
  diode: 20, transistor: 20, ic: 30, can: 30,
};

function formatPinLabel(pinId: string, nodeId: string, index: number, format?: string): string {
  if (!format) return pinId;
  return format
    .replace('{pinId}', pinId)
    .replace('{nodeId}', nodeId)
    .replace('{pinIndex}', String(index + 1));
}

export function DragContainer({ node, pos, style, pinRules, pinInfo, onPointerDown }: Props) {
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
        return <ConnectorPlugNode label={node.label} style={style} pinInfo={pinInfo} />;
      case 'splice':
        return <SpliceNode label={node.label} style={style} />;
      case 'ecu':
        return <EcuNode label={node.label} sublabel={node.sublabel} style={style} pins={node.pins} pinInfo={pinInfo} />;
      case 'switch':
        return <SwitchNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'relay':
        return <RelayNode label={node.label} sublabel={node.sublabel} style={style} />;
      case 'can':
        return <CanBusNode label={node.label} style={style} />;
      default:
        return (
          <>
            <rect x={-30} y={-15} width={60} height={30} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
            <text x={0} y={4} textAnchor="middle" fontSize={style.fontSize} fill={style.textColor}>{node.label}</text>
          </>
        );
    }
  };

  // Render pin labels outside the node
  const renderPins = () => {
    if (!node.pins || node.pins.length === 0) return null;
    const position = pinRules?.labelPosition ?? 'outside';
    if (position !== 'outside') return null;
    // Don't show pins inside ECU if configured
    if (node.type === 'ecu' && !pinRules?.showPinsInsideController) {
      // Show pins outside only
    }

    const halfH = NODE_HALF_HEIGHTS[node.type] ?? 20;
    const topPins = node.pins.slice(0, Math.ceil(node.pins.length / 2));
    const bottomPins = node.pins.slice(Math.ceil(node.pins.length / 2));

    return (
      <>
        {topPins.map((pin, i) => (
          <text
            key={`top-${pin}`}
            x={-20 + i * 20}
            y={-halfH - 6}
            textAnchor="middle"
            fontSize={7}
            fill="#718096"
          >
            {formatPinLabel(pin, node.id, i, pinRules?.labelFormat)}
          </text>
        ))}
        {bottomPins.map((pin, i) => (
          <text
            key={`bot-${pin}`}
            x={-20 + i * 20}
            y={halfH + 12}
            textAnchor="middle"
            fontSize={7}
            fill="#718096"
          >
            {formatPinLabel(pin, node.id, topPins.length + i, pinRules?.labelFormat)}
          </text>
        ))}
      </>
    );
  };

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      onPointerDown={handlePointerDown}
      style={{ cursor: 'grab' }}
    >
      {renderInner()}
      {renderPins()}
    </g>
  );
}
