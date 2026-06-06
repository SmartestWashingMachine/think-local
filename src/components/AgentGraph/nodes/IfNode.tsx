import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, AgentNodeType } from '../../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../../types/agentGraph';
import './IfNode.css';

const positionMap: Record<string, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

const handleClass: Record<string, string> = {
  string: 'handle--string',
  'list<string>': 'handle--list-string',
};

const handleExtraClass = (handleId: string, nodeType?: AgentNodeType): string => {
  if (handleId === 'true') return ' handle--if-true';
  if (handleId === 'false') return ' handle--if-false';
  if ((nodeType === 'logic-and' || nodeType === 'logic-or') && handleId === 'conditions') {
    return ' handle--conditions';
  }
  return '';
};

const handlePosition = (handleId: string): React.CSSProperties | undefined => {
  if (handleId === 'true') return { left: '30%' };
  if (handleId === 'false') return { left: '70%' };
  return undefined;
};

const handleTitle = (handleId: string, nodeType?: AgentNodeType): string | undefined => {
  if (handleId === 'true') return 'Flows when true';
  if (handleId === 'false') return 'Flows when false';
  if (nodeType === 'logic-and') {
    if (handleId === 'conditions') return 'All conditions must be met';
    if (handleId === 'value') return 'Value to pass through when all conditions are met';
    if (handleId === 'output') return 'Output value';
  }
  if (nodeType === 'logic-or') {
    if (handleId === 'conditions') return 'Any condition must be met';
    if (handleId === 'value') return 'Value to pass through when any condition is met';
    if (handleId === 'output') return 'Output value';
  }
  return undefined;
};

export default function IfNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div
      className={`if-node ${selected ? 'if-node--selected' : ''}`}
      style={{
        borderColor: def.color,
        color: def.color,
      }}
    >
      {def.handles.map((h) => (
        <Handle
          key={h.id}
          type={h.type}
          position={positionMap[h.position]}
          id={h.id}
          className={`${handleClass[h.valueType]}${handleExtraClass(h.id, nodeData.nodeType)}`}
          style={handlePosition(h.id)}
          title={handleTitle(h.id, nodeData.nodeType)}
        />
      ))}
      <span className="if-node__label">{nodeData.label}</span>
    </div>
  );
}
