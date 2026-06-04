import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../../types/agentGraph';
import './InputNode.css';

export default function InputNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div className={`input-node ${selected ? 'input-node--selected' : ''}`}>
      <div className="input-node__header" style={{ backgroundColor: def.color }}>
        <span className="input-node__label">{nodeData.label}</span>
      </div>
      <div className="input-node__body">
        {def.handles.map((h) => (
          <div key={h.id} className="input-node__handle-row">
            <Handle
              type={h.type}
              position={Position[h.position.toUpperCase() as keyof typeof Position]}
              id={h.id}
              className="input-node__handle"
            />
            <span className="input-node__handle-label">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
