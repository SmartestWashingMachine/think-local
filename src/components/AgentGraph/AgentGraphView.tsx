import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
} from '@xyflow/react';
import type { AgentNodeType, AgentNodeData, TraceEntry } from '../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../types/agentGraph';
import type { Message } from '../../types/chat';
import { STORAGE_KEYS } from '../../constants/chat';
import type { ChatCompletionTool, ChatCompletionMessage } from '@wllama/wllama/esm/types/oai-compat';
import GraphCanvas from './GraphCanvas';
import RightPane from './RightPane';
import AgentChat from './AgentChat';
import './AgentGraphView.css';

function createNode(type: AgentNodeType, position: { x: number; y: number }, id?: string): Node {
  const def = AGENT_NODE_DEFINITIONS[type];
  return {
    id: id ?? crypto.randomUUID(),
    type: def.category,
    position,
    data: { nodeType: type, label: def.label, ...def.defaults },
  } as unknown as Node;
}

const USER_QUERY_NODE = createNode('user-query', { x: 100, y: 200 });
const LLM_NODE = createNode('llm', { x: 350, y: 200 });
const CHAT_MESSAGE_NODE = createNode('chat-message', { x: 600, y: 200 });

const USER_QUERY_NODE_ID = USER_QUERY_NODE.id;
const CHAT_MESSAGE_NODE_ID = CHAT_MESSAGE_NODE.id;

const INITIAL_NODES = [USER_QUERY_NODE, LLM_NODE, CHAT_MESSAGE_NODE];
const INITIAL_EDGES: Edge[] = [
  {
    id: crypto.randomUUID(),
    source: USER_QUERY_NODE_ID,
    target: LLM_NODE.id,
    sourceHandle: 'output',
    targetHandle: 'input',
    style: { stroke: '#666', strokeWidth: 2 },
  } as Edge,
  {
    id: crypto.randomUUID(),
    source: LLM_NODE.id,
    target: CHAT_MESSAGE_NODE_ID,
    sourceHandle: 'output',
    targetHandle: 'input',
    style: { stroke: '#666', strokeWidth: 2 },
  } as Edge,
];

type RightPaneTab = 'info' | 'add' | 'trace';

interface AgentGraphViewProps {
  onBack: () => void;
  onClearChat: () => void;
  generateCompletionStream: (
    messages: ChatCompletionMessage[],
    onToken: (token: string) => void,
  ) => Promise<string>;
  generateCompletionWithTools?: (
    messages: ChatCompletionMessage[],
    onToken: (token: string) => void,
    tools: ChatCompletionTool[],
    executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
    onToolTrace?: (name: string, args: string, result: string) => void,
  ) => Promise<string>;
  messages: Message[];
  sendMessage: (
    content: string,
    onStream?: (messages: Message[], onToken: (token: string) => void, setAssistantContent: (content: string) => void) => Promise<string>,
  ) => Promise<void>;
  updateUserMessageImage: (messageId: string, imageData: string) => void;
  modelStatus: string;
  onOpenModelSelector: () => void;
}

function loadGraphNodes(): Node[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.agentGraphNodes);
    return raw ? (JSON.parse(raw) as Node[]) : null;
  } catch {
    return null;
  }
}

function loadGraphEdges(): Edge[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.agentGraphEdges);
    return raw ? (JSON.parse(raw) as Edge[]) : null;
  } catch {
    return null;
  }
}

function saveGraphNodes(nodes: Node[]) {
  localStorage.setItem(STORAGE_KEYS.agentGraphNodes, JSON.stringify(nodes));
}

function saveGraphEdges(edges: Edge[]) {
  localStorage.setItem(STORAGE_KEYS.agentGraphEdges, JSON.stringify(edges));
}

export default function AgentGraphView({ onClearChat, generateCompletionStream, generateCompletionWithTools, messages, sendMessage, updateUserMessageImage, modelStatus, onOpenModelSelector }: AgentGraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadGraphNodes() ?? INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadGraphEdges() ?? INITIAL_EDGES);

  useEffect(() => {
    saveGraphNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    saveGraphEdges(edges);
  }, [edges]);
  const [rightPaneTab, setRightPaneTab] = useState<RightPaneTab>('info');
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const traceRef = useRef<TraceEntry[]>([]);

  const handleBeforeSend = useCallback(() => {
    traceRef.current = [];
    setTraceEntries([]);
    setRightPaneTab('trace');
  }, []);

  const handleTraceEntry = useCallback((entry: TraceEntry) => {
    traceRef.current.push(entry);
    setTraceEntries([...traceRef.current]);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter((change) => {
        if (change.type === 'remove' && (change.id === USER_QUERY_NODE_ID || change.id === CHAT_MESSAGE_NODE_ID)) {
          return false;
        }
        return true;
      });
      onNodesChange(filtered);
    },
    [onNodesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const sourceData = sourceNode?.data as unknown as AgentNodeData | undefined;
      const sourceDef = sourceData ? AGENT_NODE_DEFINITIONS[sourceData.nodeType] : undefined;
      const sourceHandleCfg = sourceDef?.handles.find((h) => h.id === connection.sourceHandle);
      const isList = sourceHandleCfg?.valueType === 'list<string>';

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            style: {
              stroke: isList ? '#ccc' : '#666',
              strokeDasharray: isList ? '6 3' : undefined,
              strokeWidth: 2,
            },
          } as Edge,
          eds,
        ),
      );
    },
    [nodes, setEdges],
  );

  const selectedNode = nodes.find((n) => n.selected) ?? null;

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[]; edges: Edge[] }) => {
      if (selectedNodes.length > 0) {
        setRightPaneTab('info');
      }
    },
    [],
  );

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

  const handleUpdateNodeData = useCallback(
    (nodeId: string, newData: Partial<AgentNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...newData } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  return (
    <div className="agent-graph-view">
      <div className="agent-graph-view__body">
        <div className="agent-graph-view__canvas-section">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onAddNode={onAddNodeAtPosition}
          />
          <RightPane
            selectedNode={selectedNode}
            edges={edges}
            nodes={nodes}
            activeTab={rightPaneTab}
            onTabChange={setRightPaneTab}
            onAddNode={onAddNode}
            onUpdateNodeData={handleUpdateNodeData}
            traceEntries={traceEntries}
          />
        </div>
        <AgentChat
          messages={messages}
          sendMessage={sendMessage}
          onClearChat={onClearChat}
          updateUserMessageImage={updateUserMessageImage}
          generateCompletionStream={generateCompletionStream}
          generateCompletionWithTools={generateCompletionWithTools}
          modelStatus={modelStatus}
          onOpenModelSelector={onOpenModelSelector}
          onBeforeSend={handleBeforeSend}
          onTraceEntry={handleTraceEntry}
        />
      </div>
    </div>
  );
}
