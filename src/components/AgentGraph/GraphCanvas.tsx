import { useCallback, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AgentNodeType } from '../../types/agentGraph';
import InputNode from './nodes/InputNode';
import ProcessNode from './nodes/ProcessNode';
import IfNode from './nodes/IfNode';
import OutputNode from './nodes/OutputNode';
import './GraphCanvas.css';

const nodeTypes: NodeTypes = {
  input: InputNode,
  process: ProcessNode,
  if: IfNode,
  output: OutputNode,
};

interface GraphCanvasInnerProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (_event: React.MouseEvent, node: Node) => void;
  onAddNode: (type: AgentNodeType, position: { x: number; y: number }) => void;
}

function GraphCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onAddNode,
}: GraphCanvasInnerProps) {
  const reactFlowInstance = useReactFlow();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const nodeTypeJson = event.dataTransfer.getData('application/agent-node-type');
      if (!nodeTypeJson) return;

      const nodeType = JSON.parse(nodeTypeJson) as AgentNodeType;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onAddNode(nodeType, position);
    },
    [reactFlowInstance, onAddNode],
  );

  return (
    <div className="graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        className="graph-canvas__flow"
      >
        <Background color="#333" gap={20} size={1} />
        <Controls
          className="graph-canvas__controls"
          position="bottom-right"
        />
        <MiniMap
          className="graph-canvas__minimap"
          position="bottom-left"
          nodeColor={() => '#4fc3f7'}
          maskColor="rgba(0,0,0,0.6)"
          style={{ backgroundColor: '#1a1a2e' }}
        />
      </ReactFlow>
    </div>
  );
}

export interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (_event: React.MouseEvent, node: Node) => void;
  onAddNode: (type: AgentNodeType, position: { x: number; y: number }) => void;
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
