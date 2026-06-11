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
    imageData?: string,
    audioData?: string,
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
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string | null>(null);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedAudioFile, setAttachedAudioFile] = useState<File | null>(null);
  const [attachedAudioUrl, setAttachedAudioUrl] = useState<string | null>(null);
  const { executeGraph } = useAgentGraphRunner();
  const { executeTool, getToolDefinitions } = useMCP();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImageDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setAttachedImageDataUrl(null);
    setAttachedImageFile(null);
  }, []);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedAudioFile(file);
    setAttachedAudioUrl(URL.createObjectURL(file));
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  }, []);

  const handleRemoveAudio = useCallback(() => {
    setAttachedAudioFile(null);
    setAttachedAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || sending) return;
    const imageDataUrl = attachedImageDataUrl;
    const imageFile = attachedImageFile;
    const audioFile = attachedAudioFile;
    const audioUrl = attachedAudioUrl;
    setInputValue('');
    setAttachedImageDataUrl(null);
    setAttachedImageFile(null);
    setAttachedAudioFile(null);
    setAttachedAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
      let userImageArrayBuffer: ArrayBuffer | undefined;
      if (imageFile) {
        userImageArrayBuffer = await imageFile.arrayBuffer();
      }
      let userAudioArrayBuffer: ArrayBuffer | undefined;
      if (audioFile) {
        userAudioArrayBuffer = await audioFile.arrayBuffer();
      }
      await sendMessage(
        content,
        async (history, onToken, setAssistantContent) => {
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
            userImageArrayBuffer,
            userAudioArrayBuffer,
          );
          return result;
        },
        imageDataUrl ?? undefined,
        audioUrl ?? undefined,
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, sending, attachedImageDataUrl, attachedImageFile, attachedAudioFile, attachedAudioUrl, sendMessage, updateUserMessageImage, messages, generateCompletionStream, generateCompletionWithTools, executeGraph, executeTool, getToolDefinitions, onBeforeSend, onTraceEntry]);

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
              {msg.audioData && (
                <audio className="agent-chat__audio" src={msg.audioData} controls />
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
        <div className="agent-chat__input-toolbar">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            hidden
          />
          <button
            className="agent-chat__image-btn"
            onClick={() => imageInputRef.current?.click()}
            type="button"
            title="Attach image"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            hidden
          />
          <button
            className="agent-chat__image-btn"
            onClick={() => audioInputRef.current?.click()}
            type="button"
            title="Attach audio"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
          {attachedImageDataUrl && (
            <div className="agent-chat__image-preview">
              <img src={attachedImageDataUrl} alt="Attached" />
              <button
                className="agent-chat__image-remove"
                onClick={handleRemoveImage}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          {attachedAudioUrl && (
            <div className="agent-chat__image-preview">
              <audio src={attachedAudioUrl} controls />
              <button
                className="agent-chat__image-remove"
                onClick={handleRemoveAudio}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
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
