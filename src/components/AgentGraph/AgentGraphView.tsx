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
import type { AgentNodeType, AgentNodeData, TraceEntry, ValueType } from '../../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../../types/agentGraph';
import { applyEdgeStyle } from './edgeStyles';
import type { Message } from '../../types/chat';
import { STORAGE_KEYS } from '../../constants/chat';
import { PRESETS, getPreset, DEFAULT_PRESET_ID } from '../../constants/presets';
import type { ChatCompletionTool, ChatCompletionMessage } from '@wllama/wllama/esm/types/oai-compat';
import GraphCanvas from './GraphCanvas';
import RightPane from './RightPane';
import AgentChat from './AgentChat';
import PresetBar from './PresetBar';
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

function loadActivePresetId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.activePreset) ?? DEFAULT_PRESET_ID;
  } catch {
    return DEFAULT_PRESET_ID;
  }
}

function saveActivePresetId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.activePreset, id);
  } catch {
    // ignore
  }
}

function loadInitialGraph(presetId: string): { nodes: Node[]; edges: Edge[] } {
  const savedNodes = loadGraphNodesRaw();
  const savedEdges = loadGraphEdgesRaw();
  if (savedNodes && savedEdges) {
    return { nodes: savedNodes, edges: savedEdges };
  }
  const preset = getPreset(presetId);
  if (preset) {
    return preset.create();
  }
  return getPreset(DEFAULT_PRESET_ID)!.create();
}

function loadGraphNodesRaw(): Node[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.agentGraphNodes);
    return raw ? (JSON.parse(raw) as Node[]) : null;
  } catch {
    return null;
  }
}

function loadGraphEdgesRaw(): Edge[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.agentGraphEdges);
    return raw ? (JSON.parse(raw) as Edge[]) : null;
  } catch {
    return null;
  }
}

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
    imageData?: string,
    audioData?: string,
  ) => Promise<void>;
  updateUserMessageImage: (messageId: string, imageData: string) => void;
  modelStatus: string;
  onOpenModelSelector: () => void;
}

const PROTECTED_NODE_TYPES = new Set<AgentNodeType>(['user-query', 'user-image', 'user-audio', 'chat-message']);

function saveGraphNodes(nodes: Node[]) {
  localStorage.setItem(STORAGE_KEYS.agentGraphNodes, JSON.stringify(nodes));
}

function saveGraphEdges(edges: Edge[]) {
  localStorage.setItem(STORAGE_KEYS.agentGraphEdges, JSON.stringify(edges));
}

export default function AgentGraphView({ onClearChat, generateCompletionStream, generateCompletionWithTools, messages, sendMessage, updateUserMessageImage, modelStatus, onOpenModelSelector }: AgentGraphViewProps) {
  const initialPresetId = loadActivePresetId();
  const initialGraph = loadInitialGraph(initialPresetId);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [activePresetId, setActivePresetId] = useState(initialPresetId);

  useEffect(() => {
    saveGraphNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    saveGraphEdges(edges);
  }, [edges]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = getPreset(presetId);
      if (!preset) return;
      const { nodes: newNodes, edges: newEdges } = preset.create();
      setNodes(newNodes);
      setEdges(newEdges);
      setActivePresetId(presetId);
      saveActivePresetId(presetId);
    },
    [setNodes, setEdges],
  );

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
        if (change.type === 'remove') {
          const node = nodes.find((n) => n.id === change.id);
          const nodeData = node?.data as unknown as AgentNodeData | undefined;
          if (nodeData && PROTECTED_NODE_TYPES.has(nodeData.nodeType)) {
            return false;
          }
        }
        return true;
      });
      onNodesChange(filtered);
    },
    [onNodesChange, nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const sourceData = sourceNode?.data as unknown as AgentNodeData | undefined;
      const sourceDef = sourceData ? AGENT_NODE_DEFINITIONS[sourceData.nodeType] : undefined;
      const sourceHandleCfg = sourceDef?.handles.find((h) => h.id === connection.sourceHandle);
      const valueType: ValueType = sourceHandleCfg?.valueType ?? 'string';

      setEdges((eds) =>
        addEdge(
          applyEdgeStyle({ ...connection } as Edge, valueType),
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
          <div className="agent-graph-view__canvas-column">
            <PresetBar
              presets={PRESETS}
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
            />
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onAddNode={onAddNodeAtPosition}
            />
          </div>
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
