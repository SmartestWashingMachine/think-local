import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../../types/agentGraph';
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

const handleStyle = (handleId: string): React.CSSProperties | undefined => {
  if (handleId === 'true') return { background: '#4caf50', border: '2px solid #1b5e20', left: '30%' };
  if (handleId === 'false') return { background: '#f44336', border: '2px solid #b71c1c', left: '70%' };
  return undefined;
};

const handleTitle = (handleId: string): string | undefined => {
  if (handleId === 'true') return 'Flows when true';
  if (handleId === 'false') return 'Flows when false';
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
          className={handleClass[h.valueType]}
          style={handleStyle(h.id)}
          title={handleTitle(h.id)}
        />
      ))}
      <span className="if-node__label">{nodeData.label}</span>
    </div>
  );
}
