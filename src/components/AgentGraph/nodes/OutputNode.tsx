import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../../types/agentGraph';
import './OutputNode.css';

export default function OutputNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div className={`output-node ${selected ? 'output-node--selected' : ''}`}>
      <div className="output-node__header" style={{ backgroundColor: def.color }}>
        <span className="output-node__label">{nodeData.label}</span>
      </div>
      {def.handles.map((h) => (
        <Handle
          key={h.id}
          type={h.type}
          position={Position[h.position.toUpperCase() as keyof typeof Position]}
          id={h.id}
          className="output-node__handle"
        />
      ))}
    </div>
  );
}
