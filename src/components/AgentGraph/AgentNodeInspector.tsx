import type { Node } from '@xyflow/react';
import {
  AGENT_NODE_DEFINITIONS,
  AGENT_NODE_CATEGORIES,
  type AgentNodeData,
} from '../../types/agentGraph';
import './AgentNodeInspector.css';

interface AgentNodeInspectorProps {
  node: Node | null;
}

export default function AgentNodeInspector({ node }: AgentNodeInspectorProps) {
  if (!node) {
    return (
      <div className="inspector inspector--empty">
        <p className="inspector__placeholder">Select a node on the canvas to inspect its properties.</p>
      </div>
    );
  }

  const data = node.data as unknown as AgentNodeData;
  const def = AGENT_NODE_DEFINITIONS[data.nodeType];
  const category = AGENT_NODE_CATEGORIES.find((c) => c.key === def.category);

  return (
    <div className="inspector">
      <div className="inspector__header" style={{ borderLeftColor: def.color }}>
        <h3 className="inspector__title">{data.label}</h3>
        <span className="inspector__badge" style={{ backgroundColor: def.color }}>
          {category?.label ?? def.category}
        </span>
      </div>

      <div className="inspector__section">
        <h4 className="inspector__section-title">Type</h4>
        <p className="inspector__text">{def.type}</p>
      </div>

      <div className="inspector__section">
        <h4 className="inspector__section-title">Description</h4>
        <p className="inspector__text">{def.description}</p>
      </div>

      <div className="inspector__section">
        <h4 className="inspector__section-title">Handles</h4>
        <div className="inspector__handles">
          {def.handles.length === 0 && (
            <p className="inspector__text inspector__text--muted">No connections</p>
          )}
          {def.handles.map((h) => (
            <div key={h.id} className="inspector__handle-row">
              <span
                className={`inspector__handle-tag inspector__handle-tag--${h.type}`}
              >
                {h.type === 'source' ? 'OUT' : 'IN'}
              </span>
              <span className="inspector__handle-name">{h.label}</span>
              <span className="inspector__handle-position">{h.position}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="inspector__section">
        <h4 className="inspector__section-title">Node ID</h4>
        <p className="inspector__text inspector__text--mono">{node.id}</p>
      </div>
    </div>
  );
}
