import { useState } from 'react';
import type { Conversation, ViewState } from '../types/chat';
import type { StoredDocument } from '../types/rag';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import RagView from './RagView';
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

  async function handleSend(content: string) {
    setSending(true);
    try {
      await onSendMessage(content);
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
        onOpenEmbeddingModelSelector={onOpenEmbeddingModelSelector}
        onOpenAddDocuments={onOpenAddDocuments}
        onNavigate={onNavigate}
        modelStatus={modelStatus}
        embeddingModelStatus={embeddingModelStatus}
      />
      <main className="chat__main">
        {view === 'rag' ? (
          <RagView documents={ragDocuments} />
        ) : !activeConversation ? (
          <div className="chat__empty">
            <p>Select a conversation or create a new one to start chatting.</p>
          </div>
        ) : (
          <>
            <MessageList messages={activeConversation.messages} />
            <MessageInput onSend={handleSend} disabled={sending} />
          </>
        )}
      </main>
    </div>
  );
}
