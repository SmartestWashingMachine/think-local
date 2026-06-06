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
  type OnSelectionChangeFunc,
  type NodeTypes,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AgentNodeType, AgentNodeData } from '../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../types/agentGraph';
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
  onSelectionChange: OnSelectionChangeFunc;
  onAddNode: (type: AgentNodeType, position: { x: number; y: number }) => void;
}

function GraphCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onAddNode,
}: GraphCanvasInnerProps) {
  const reactFlowInstance = useReactFlow();

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target || connection.sourceHandle == null || connection.targetHandle == null) return false;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceData = sourceNode.data as unknown as AgentNodeData;
      const targetData = targetNode.data as unknown as AgentNodeData;
      const sourceDef = AGENT_NODE_DEFINITIONS[sourceData.nodeType];
      const targetDef = AGENT_NODE_DEFINITIONS[targetData.nodeType];

      const sourceHandleCfg = sourceDef.handles.find((h) => h.id === connection.sourceHandle);
      const targetHandleCfg = targetDef.handles.find((h) => h.id === connection.targetHandle);
      if (!sourceHandleCfg || !targetHandleCfg) return false;

      if (targetHandleCfg.acceptsTypes) {
        return targetHandleCfg.acceptsTypes.includes(sourceHandleCfg.valueType);
      }
      return sourceHandleCfg.valueType === targetHandleCfg.valueType;
    },
    [nodes],
  );

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
        onSelectionChange={onSelectionChange}
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
        isValidConnection={isValidConnection}
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
  onSelectionChange: OnSelectionChangeFunc;
  onAddNode: (type: AgentNodeType, position: { x: number; y: number }) => void;
}

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
