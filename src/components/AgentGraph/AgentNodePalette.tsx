import { useCallback, type DragEvent } from 'react';
import {
  AGENT_NODE_DEFINITIONS,
  AGENT_NODE_CATEGORIES,
  type AgentNodeType,
} from '../../types/agentGraph';
import './AgentNodePalette.css';

interface AgentNodePaletteProps {
  onAddNode: (type: AgentNodeType) => void;
}

export default function AgentNodePalette({ onAddNode }: AgentNodePaletteProps) {
  const onDragStart = useCallback(
    (event: DragEvent, nodeType: AgentNodeType) => {
      event.dataTransfer.setData('application/agent-node-type', JSON.stringify(nodeType));
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const disabledTypes = new Set<AgentNodeType>(['user-query']);

  return (
    <div className="palette">
      {AGENT_NODE_CATEGORIES.map((cat) => (
        <div key={cat.key} className="palette__group">
          <h4 className="palette__group-title">{cat.label}</h4>
          {Object.values(AGENT_NODE_DEFINITIONS)
            .filter((def) => def.category === cat.key)
            .map((def) => {
              const disabled = disabledTypes.has(def.type);
              return (
                <button
                  key={def.type}
                  className={`palette__item ${disabled ? 'palette__item--disabled' : ''}`}
                  draggable={!disabled}
                  onDragStart={(e) => onDragStart(e, def.type)}
                  onClick={() => !disabled && onAddNode(def.type)}
                  type="button"
                  title={disabled ? 'Always present in the graph' : `Drag or click to add ${def.label}`}
                >
                  <span
                    className="palette__item-dot"
                    style={{ backgroundColor: def.color }}
                  />
                  <div className="palette__item-info">
                    <span className="palette__item-name">{def.label}</span>
                    <span className="palette__item-desc">{def.description}</span>
                  </div>
                  {!disabled && <span className="palette__item-drag-hint">drag</span>}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}
