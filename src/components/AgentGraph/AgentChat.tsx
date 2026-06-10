import { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, TraceEntry } from '../../types/agentGraph';
import type { Message } from '../../types/chat';
import { STORAGE_KEYS } from '../../constants/chat';
import { useAgentGraphRunner } from '../../hooks/useAgentGraphRunner';
import { useMCP } from '../../hooks/useMCP';
import { generateSystemMessage } from '../../types/mcp';
import type { MCPToolType } from '../../types/mcp';
import type { ChatCompletionTool, ChatCompletionMessage } from '@wllama/wllama/esm/types/oai-compat';
import './AgentChat.css';

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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface AgentChatProps {
  messages: Message[];
  sendMessage: (
    content: string,
    onStream?: (messages: Message[], onToken: (token: string) => void, setAssistantContent: (content: string) => void) => Promise<string>,
  ) => Promise<void>;
  onClearChat: () => void;
  updateUserMessageImage: (messageId: string, imageData: string) => void;
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
  modelStatus: string;
  onOpenModelSelector: () => void;
  expanded?: boolean;
  onBeforeSend?: () => void;
  onTraceEntry?: (entry: TraceEntry) => void;
}

export default function AgentChat({
  messages,
  sendMessage,
  onClearChat,
  updateUserMessageImage,
  generateCompletionStream,
  generateCompletionWithTools,
  modelStatus,
  onOpenModelSelector,
  expanded = false,
  onBeforeSend,
  onTraceEntry,
}: AgentChatProps) {
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { executeGraph } = useAgentGraphRunner();
  const { executeTool, getToolDefinitions } = useMCP();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || sending) return;
    setInputValue('');
    setSending(true);

    const nodes = loadGraphNodes() ?? [];
    const edges = loadGraphEdges() ?? [];

    onBeforeSend?.();

    const mcpNode = nodes.find((n) => (n.data as unknown as AgentNodeData).nodeType === 'mcp');
    let mcpConfig: { systemMessage: string; tools: ChatCompletionTool[]; executeTool: (name: string, args: Record<string, unknown>) => Promise<string> } | null = null;
    if (mcpNode) {
      const mcpData = mcpNode.data as unknown as AgentNodeData;
      const enabledToolTypes: MCPToolType[] = [];
      if (mcpData.currentDateEnabled) enabledToolTypes.push('current-date');
      if (mcpData.calculatorEnabled) enabledToolTypes.push('calculator');
      if (mcpData.sayOutLoudEnabled) enabledToolTypes.push('say-out-loud');
      if (mcpData.regexFilterEnabled) enabledToolTypes.push('regex-filter');
      const systemMessageContent = (mcpData.systemMessage as string) || (enabledToolTypes.length > 0 ? generateSystemMessage(enabledToolTypes) : '');
      if (enabledToolTypes.length > 0) {
        mcpConfig = {
          systemMessage: systemMessageContent,
          tools: getToolDefinitions(enabledToolTypes),
          executeTool,
        };
      }
    }

    const preview = (val: string, max = 200) =>
      val.length > max ? val.slice(0, max) + '...' : val;

    if (onTraceEntry && mcpNode && mcpConfig) {
      const mcpData = mcpNode.data as unknown as AgentNodeData;
      const systemMsg = (mcpData.systemMessage as string) || '';
      if (systemMsg) {
        onTraceEntry({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          nodeId: mcpNode.id,
          nodeLabel: 'System Message',
          nodeType: 'system-message',
          type: 'input',
          description: systemMsg,
        });
      }
    }

    for (const msg of messages) {
      onTraceEntry?.({
        id: crypto.randomUUID(),
        timestamp: msg.createdAt,
        nodeId: 'chat-history',
        nodeLabel: msg.role === 'user' ? 'User' : 'Assistant',
        nodeType: msg.role === 'user' ? 'user-query' : 'chat-message',
        type: msg.role === 'user' ? 'input' : 'output',
        description: preview(msg.content),
      });
    }

    onTraceEntry?.({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      nodeId: 'chat-history',
      nodeLabel: 'User',
      nodeType: 'user-query',
      type: 'input',
      description: preview(content),
    });

    try {
      await sendMessage(content, async (history, onToken, setAssistantContent) => {
        const userMsg = history.length > 0 ? history[history.length - 1] : null;
        const onUserImageCapture = userMsg
          ? (dataUrl: string) => updateUserMessageImage(userMsg.id, dataUrl)
          : undefined;
        const result = await executeGraph(
          nodes, edges, content, messages, generateCompletionStream, onToken, setAssistantContent,
          (entry) => {
            onTraceEntry?.(entry);
          },
          mcpConfig,
          generateCompletionWithTools,
          onUserImageCapture,
        );
        return result;
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, sending, sendMessage, updateUserMessageImage, messages, generateCompletionStream, generateCompletionWithTools, executeGraph, executeTool, getToolDefinitions, onBeforeSend, onTraceEntry]);

  const rootClass = expanded ? 'agent-chat agent-chat--expanded' : 'agent-chat';

  return (
    <div className={rootClass}>
      <div className="agent-chat__messages" ref={messagesRef}>
        {messages.length === 0 && (
          <p className="agent-chat__empty-msg">Type a message to run the graph.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`agent-chat__message agent-chat__message--${msg.role}`}>
            <div className="agent-chat__bubble">
              {msg.imageData && (
                <img className="agent-chat__img" src={msg.imageData} alt="Webcam capture" />
              )}
              <p className="agent-chat__msg-content">{msg.content}</p>
              <span className="agent-chat__msg-time">{formatTime(msg.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="agent-chat__input-area">
        {modelStatus !== 'loaded' && (
          <button className="agent-chat__model-warning" onClick={onOpenModelSelector} type="button">
            No model loaded. Select a model first.
          </button>
        )}
        <div className="agent-chat__input-row">
          <textarea
            ref={inputRef}
            className="agent-chat__input"
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
            className="agent-chat__send-btn"
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
            className="agent-chat__clear-btn"
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
  );
}
