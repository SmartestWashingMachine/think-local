import type { Node } from '@xyflow/react';
import type { AgentNodeData, AgentNodeType, TraceEntry } from '../../types/agentGraph';
import AgentNodeInspector from './AgentNodeInspector';
import AgentNodePalette from './AgentNodePalette';
import TracePanel from './TracePanel';
import './RightPane.css';

type RightPaneTab = 'info' | 'add' | 'trace';

interface RightPaneProps {
  selectedNode: Node | null;
  activeTab: RightPaneTab;
  onTabChange: (tab: RightPaneTab) => void;
  onAddNode: (type: AgentNodeType) => void;
  onUpdateNodeData: (nodeId: string, newData: Partial<AgentNodeData>) => void;
  traceEntries: TraceEntry[];
}

export default function RightPane({
  selectedNode,
  activeTab,
  onTabChange,
  onAddNode,
  onUpdateNodeData,
  traceEntries,
}: RightPaneProps) {
  return (
    <aside className="right-pane">
      <div className="right-pane__tabs">
        <button
          className={`right-pane__tab ${activeTab === 'info' ? 'right-pane__tab--active' : ''}`}
          onClick={() => onTabChange('info')}
          type="button"
        >
          Info
        </button>
        <button
          className={`right-pane__tab ${activeTab === 'add' ? 'right-pane__tab--active' : ''}`}
          onClick={() => onTabChange('add')}
          type="button"
        >
          Add Component
        </button>
        <button
          className={`right-pane__tab ${activeTab === 'trace' ? 'right-pane__tab--active' : ''}`}
          onClick={() => onTabChange('trace')}
          type="button"
        >
          Trace
        </button>
      </div>
      <div className="right-pane__content">
        {activeTab === 'info' ? (
          <AgentNodeInspector
            node={selectedNode}
            onUpdateNodeData={onUpdateNodeData}
          />
        ) : activeTab === 'add' ? (
          <AgentNodePalette onAddNode={onAddNode} />
        ) : (
          <TracePanel entries={traceEntries} />
        )}
      </div>
    </aside>
  );
}
