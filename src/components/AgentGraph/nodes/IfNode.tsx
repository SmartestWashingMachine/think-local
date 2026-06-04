import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../../types/agentGraph';
import './IfNode.css';

export default function IfNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div className={`if-node ${selected ? 'if-node--selected' : ''}`}>
      <div className="if-node__header" style={{ backgroundColor: def.color }}>
        <span className="if-node__label">{nodeData.label}</span>
      </div>
      <div className="if-node__body">
        {def.handles.map((h) => (
          <div key={h.id} className={`if-node__handle-row if-node__handle-row--${h.id}`}>
            <Handle
              type={h.type}
              position={Position[h.position.toUpperCase() as keyof typeof Position]}
              id={h.id}
              className={`if-node__handle if-node__handle--${h.id}`}
            />
            <span className={`if-node__handle-label if-node__handle-label--${h.id}`}>{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
