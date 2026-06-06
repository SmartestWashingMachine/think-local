import { useState } from 'react';
import type { Conversation, ViewState, Message } from '../types/chat';
import type { StoredDocument } from '../types/rag';
import { RAG_FIRST_MESSAGE_TEMPLATE, RAG_DEFAULT_TEMPLATE } from '../constants/rag';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RagView from './RagView';
import AgentGraphView from './AgentGraph/AgentGraphView';
import './Chat.css';

interface ChatProps {
  theme: 'light' | 'dark';
  view: ViewState;
  onToggleTheme: () => void;
  conversations: Conversation[];
  activeId: string | null;
  activeConversation: Conversation | null;
  onCreateConversation: () => string;
  onSwitchConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  sendMessage: (
    content: string,
    onStream?: (messages: Message[], onToken: (token: string) => void, setAssistantContent: (content: string) => void) => Promise<string>,
  ) => Promise<void>;
  clearMessages: () => void;
  generateCompletionStream: (
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    onToken: (token: string) => void,
  ) => Promise<string>;
  onAugmentWithRag?: (query: string) => Promise<string>;
  onImportConversations: (conversations: Conversation[]) => void;
  onExportConversations: () => Conversation[];
  onOpenModelSelector: () => void;
  onOpenEmbeddingModelSelector: () => void;
  onOpenAddDocuments: () => void;
  onNavigate: (view: ViewState) => void;
  modelStatus: string;
  embeddingModelStatus: string;
  ragDocuments: StoredDocument[];
}

export default function Chat({
  theme,
  view,
  onToggleTheme,
  conversations,
  activeId,
  activeConversation,
  onCreateConversation,
  onSwitchConversation,
  onDeleteConversation,
  onSendMessage,
  sendMessage,
  clearMessages,
  generateCompletionStream,
  onAugmentWithRag,
  onImportConversations,
  onExportConversations,
  onOpenModelSelector,
  onOpenEmbeddingModelSelector,
  onOpenAddDocuments,
  onNavigate,
  modelStatus,
  embeddingModelStatus,
  ragDocuments,
}: ChatProps) {
  const [sending, setSending] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);

  async function handleSend(content: string) {
    setSending(true);
    try {
      let finalContent = content;
      if (ragEnabled && activeConversation) {
        if (activeConversation.messages.length === 0 && onAugmentWithRag) {
          finalContent = await onAugmentWithRag(content);
        } else {
          finalContent = activeConversation.messages.length === 0
            ? RAG_FIRST_MESSAGE_TEMPLATE(content)
            : RAG_DEFAULT_TEMPLATE(content);
        }
      }
      await onSendMessage(finalContent);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        theme={theme}
        currentView={view}
        onNewChat={onCreateConversation}
        onSelectConversation={onSwitchConversation}
        onDeleteConversation={onDeleteConversation}
        onImport={onImportConversations}
        onExport={onExportConversations}
        onToggleTheme={onToggleTheme}
        onOpenModelSelector={onOpenModelSelector}
        onNavigate={onNavigate}
        modelStatus={modelStatus}
      />
      <main className="chat__main">
        {view === 'agent-graph' ? (
          <AgentGraphView
            onBack={() => onNavigate('chat')}
            onClearChat={clearMessages}
            generateCompletionStream={generateCompletionStream}
            messages={activeConversation?.messages ?? []}
            sendMessage={sendMessage}
            modelStatus={modelStatus}
          />
        ) : view === 'rag' ? (
          <RagView
            documents={ragDocuments}
            embeddingModelStatus={embeddingModelStatus}
            onOpenEmbeddingModelSelector={onOpenEmbeddingModelSelector}
            onOpenAddDocuments={onOpenAddDocuments}
          />
        ) : !activeConversation ? (
          <div className="chat__empty">
            <p>Select a conversation or create a new one to start chatting.</p>
          </div>
        ) : (
          <>
            <MessageList messages={activeConversation.messages} />
            <MessageInput onSend={handleSend} disabled={sending} ragEnabled={ragEnabled} onToggleRag={() => setRagEnabled((v) => !v)} />
          </>
        )}
      </main>
    </div>
  );
}
