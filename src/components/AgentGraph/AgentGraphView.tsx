import { useState, useCallback, useRef, useEffect } from 'react';
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
import { useAgentGraphRunner } from '../../hooks/useAgentGraphRunner';
import GraphCanvas from './GraphCanvas';
import RightPane from './RightPane';
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
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    onToken: (token: string) => void,
  ) => Promise<string>;
  messages: Message[];
  sendMessage: (
    content: string,
    onStream?: (messages: Message[], onToken: (token: string) => void, setAssistantContent: (content: string) => void) => Promise<string>,
  ) => Promise<void>;
  modelStatus: string;
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

export default function AgentGraphView({ onClearChat, generateCompletionStream, messages, sendMessage, modelStatus }: AgentGraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(loadGraphNodes() ?? INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadGraphEdges() ?? INITIAL_EDGES);

  useEffect(() => {
    saveGraphNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    saveGraphEdges(edges);
  }, [edges]);
  const [rightPaneTab, setRightPaneTab] = useState<RightPaneTab>('info');
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const { executeGraph } = useAgentGraphRunner();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || sending) return;
    setInputValue('');
    setSending(true);
    setTraceEntries([]);
    setRightPaneTab('trace');
    const collected: TraceEntry[] = [];
    try {
      await sendMessage(content, async (_history, onToken, setAssistantContent) => {
        const result = await executeGraph(nodes, edges, content, generateCompletionStream, onToken, setAssistantContent, (entry) => {
          collected.push(entry);
          setTraceEntries([...collected]);
        });
        return result;
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, sending, sendMessage, nodes, edges, generateCompletionStream, executeGraph]);

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

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
        <div className="agent-graph-view__chat">
          <div className="agent-graph-view__messages" ref={messagesRef}>
            {messages.length === 0 && (
              <p className="agent-graph-view__empty-msg">Type a message to run the graph.</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`agent-graph-view__message agent-graph-view__message--${msg.role}`}>
                <div className="agent-graph-view__bubble">
                  <p className="agent-graph-view__msg-content">{msg.content}</p>
                  <span className="agent-graph-view__msg-time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="agent-graph-view__input-area">
            {modelStatus !== 'loaded' && (
              <p className="agent-graph-view__model-warning">No model loaded. Select a model first.</p>
            )}
            <div className="agent-graph-view__input-row">
              <textarea
                ref={inputRef}
                className="agent-graph-view__input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message to run the graph..."
                rows={1}
                disabled={sending}
              />
              <button
                className="agent-graph-view__send-btn"
                onClick={handleSend}
                disabled={sending || !inputValue.trim() || modelStatus !== 'loaded'}
                type="button"
              >
                {sending ? '...' : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
                {!sending && 'Send'}
              </button>
              <button
                className="agent-graph-view__clear-btn"
                onClick={onClearChat}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
