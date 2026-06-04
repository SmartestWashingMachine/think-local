import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../../types/agentGraph';
import './ProcessNode.css';

export default function ProcessNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div className={`process-node ${selected ? 'process-node--selected' : ''}`}>
      <div className="process-node__header" style={{ backgroundColor: def.color }}>
        <span className="process-node__label">{nodeData.label}</span>
      </div>
      <div className="process-node__body">
        {def.handles.map((h) => (
          <div key={h.id} className="process-node__handle-row">
            <Handle
              type={h.type}
              position={Position[h.position.toUpperCase() as keyof typeof Position]}
              id={h.id}
              className="process-node__handle"
            />
            <span className="process-node__handle-label">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
