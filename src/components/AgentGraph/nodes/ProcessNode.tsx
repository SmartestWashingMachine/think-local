import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, ValueType } from '../../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../../types/agentGraph';
import './ProcessNode.css';

const positionMap: Record<string, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

const valueTypeStyle: Record<ValueType, React.CSSProperties> = {
  string: {
    background: '#4fc3f7',
    border: '2px solid #4fc3f7',
    width: 12,
    height: 12,
  },
  'list<string>': {
    background: '#ffb74d',
    border: '2px dashed #ffb74d',
    width: 12,
    height: 12,
    borderRadius: 2,
  },
};

export default function ProcessNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[nodeData.nodeType];

  return (
    <div className={`process-node ${selected ? 'process-node--selected' : ''}`}>
      {def.handles.map((h) => (
        <Handle
          key={h.id}
          type={h.type}
          position={positionMap[h.position]}
          id={h.id}
          style={valueTypeStyle[h.valueType]}
        />
      ))}
      <span className="process-node__label">{nodeData.label}</span>
    </div>
  );
}
