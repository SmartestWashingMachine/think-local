import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import {
  AGENT_NODE_DEFINITIONS,
  AGENT_NODE_CATEGORIES,
  type AgentNodeData,
  type PropertyDefinition,
} from '../../types/agentGraph';
import './AgentNodeInspector.css';

interface AgentNodeInspectorProps {
  node: Node | null;
  onUpdateNodeData: (nodeId: string, newData: Partial<AgentNodeData>) => void;
}

export default function AgentNodeInspector({ node, onUpdateNodeData }: AgentNodeInspectorProps) {
  const handleLabelChange = useCallback(
    (nodeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateNodeData(nodeId, { label: e.target.value });
    },
    [onUpdateNodeData],
  );

  const handlePropertyChange = useCallback(
    (nodeId: string, key: string, value: string | number | boolean) => {
      onUpdateNodeData(nodeId, { [key]: value });
    },
    [onUpdateNodeData],
  );

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
        <input
          className="inspector__name-input"
          type="text"
          value={data.label}
          onChange={(e) => handleLabelChange(node.id, e)}
        />
        <span className="inspector__badge" style={{ backgroundColor: def.color }}>
          {category?.label ?? def.category}
        </span>
      </div>

      <div className="inspector__section">
        <p className="inspector__description">{def.description}</p>
      </div>

      {def.properties.map((prop) => (
        <PropertyField
          key={prop.key}
          nodeId={node.id}
          prop={prop}
          value={data[prop.key]}
          onChange={handlePropertyChange}
        />
      ))}

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
              <span className="inspector__handle-type">{h.valueType}</span>
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

interface PropertyFieldProps {
  nodeId: string;
  prop: PropertyDefinition;
  value: unknown;
  onChange: (nodeId: string, key: string, value: string | number | boolean) => void;
}

function PropertyField({ nodeId, prop, value, onChange }: PropertyFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (prop.type === 'boolean') {
        onChange(nodeId, prop.key, (e.target as HTMLInputElement).checked);
      } else if (prop.type === 'number') {
        onChange(nodeId, prop.key, Number(e.target.value));
      } else {
        onChange(nodeId, prop.key, e.target.value);
      }
    },
    [nodeId, prop, onChange],
  );

  return (
    <div className="inspector__section">
      <h4 className="inspector__section-title">{prop.label}</h4>
      {prop.description && (
        <p className="inspector__text inspector__text--muted">{prop.description}</p>
      )}
      {prop.type === 'boolean' ? (
        <label className="inspector__checkbox-label">
          <input
            type="checkbox"
            className="inspector__checkbox"
            checked={!!value}
            onChange={handleChange}
          />
          {prop.label}
        </label>
      ) : prop.type === 'select' ? (
        <select
          className="inspector__select"
          value={String(value ?? '')}
          onChange={handleChange}
        >
          {prop.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : prop.type === 'number' ? (
        <input
          className="inspector__input"
          type="number"
          value={Number(value ?? 0)}
          min={prop.min}
          max={prop.max}
          step={prop.step}
          onChange={handleChange}
        />
      ) : (
        <input
          className="inspector__input"
          type="text"
          value={String(value ?? '')}
          placeholder={prop.placeholder}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
