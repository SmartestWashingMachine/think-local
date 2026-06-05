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

export default function IfNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div className={`if-node ${selected ? 'if-node--selected' : ''}`}>
      {def.handles.map((h) => (
        <Handle
          key={h.id}
          type={h.type}
          position={positionMap[h.position]}
          id={h.id}
          className={handleClass[h.valueType]}
        />
      ))}
      <span className="if-node__label">{nodeData.label}</span>
    </div>
  );
}
