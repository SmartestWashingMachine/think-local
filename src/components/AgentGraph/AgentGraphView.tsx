import { useState, useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
} from '@xyflow/react';
import type { AgentNodeType } from '../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../types/agentGraph';
import GraphCanvas from './GraphCanvas';
import RightPane from './RightPane';
import './AgentGraphView.css';

function createNode(type: AgentNodeType, position: { x: number; y: number }, id?: string): Node {
  const def = AGENT_NODE_DEFINITIONS[type];
  return {
    id: id ?? crypto.randomUUID(),
    type: def.category,
    position,
    data: { nodeType: type, label: def.label },
  } as unknown as Node;
}

const INITIAL_NODE = createNode('user-query', { x: 100, y: 200 });
const USER_QUERY_NODE_ID = INITIAL_NODE.id;

type RightPaneTab = 'info' | 'add';

interface AgentGraphViewProps {
  onBack: () => void;
}

export default function AgentGraphView({ onBack }: AgentGraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([INITIAL_NODE]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter((change) => {
        if (change.type === 'remove' && change.id === USER_QUERY_NODE_ID) {
          return false;
        }
        return true;
      });
      onNodesChange(filtered);
    },
    [onNodesChange],
  );
  const initialEdges: Edge[] = [];
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rightPaneTab, setRightPaneTab] = useState<RightPaneTab>('info');

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setRightPaneTab('info');
    },
    [],
  );

  const handleCanvasClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onAddNode = useCallback(
    (type: AgentNodeType) => {
      const offset = 60 * (nodes.length + 1);
      const newNode = createNode(type, {
        x: 250 + offset,
        y: 150 + offset,
      });
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes],
  );

  const onAddNodeAtPosition = useCallback(
    (type: AgentNodeType, position: { x: number; y: number }) => {
      const newNode = createNode(type, position);
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  return (
    <div className="agent-graph-view">
      <header className="agent-graph-view__header">
        <div className="agent-graph-view__header-left">
          <button
            className="agent-graph-view__back-btn"
            onClick={onBack}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <h2 className="agent-graph-view__title">Agent Graph Builder</h2>
        </div>
        <div className="agent-graph-view__header-right">
          <span className="agent-graph-view__node-count">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>
      <div className="agent-graph-view__body" onClick={handleCanvasClick}>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onAddNode={onAddNodeAtPosition}
        />
        <RightPane
          selectedNode={selectedNode}
          activeTab={rightPaneTab}
          onTabChange={setRightPaneTab}
          onAddNode={onAddNode}
        />
      </div>
    </div>
  );
}
