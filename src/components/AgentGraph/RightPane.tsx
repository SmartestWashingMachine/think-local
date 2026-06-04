import type { Node } from '@xyflow/react';
import type { AgentNodeType } from '../../types/agentGraph';
import AgentNodeInspector from './AgentNodeInspector';
import AgentNodePalette from './AgentNodePalette';
import './RightPane.css';

type RightPaneTab = 'info' | 'add';

interface RightPaneProps {
  selectedNode: Node | null;
  activeTab: RightPaneTab;
  onTabChange: (tab: RightPaneTab) => void;
  onAddNode: (type: AgentNodeType) => void;
}

export default function RightPane({
  selectedNode,
  activeTab,
  onTabChange,
  onAddNode,
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
      </div>
      <div className="right-pane__content">
        {activeTab === 'info' ? (
          <AgentNodeInspector node={selectedNode} />
        ) : (
          <AgentNodePalette onAddNode={onAddNode} />
        )}
      </div>
    </aside>
  );
}
