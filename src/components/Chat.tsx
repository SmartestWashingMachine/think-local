import { useState } from 'react';
import type { Conversation } from '../types/chat';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import './Chat.css';

interface ChatProps {
  theme: 'light' | 'dark';
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
  modelStatus: string;
}

export default function Chat({
  theme,
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
  modelStatus,
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
        onNewChat={onCreateConversation}
        onSelectConversation={onSwitchConversation}
        onDeleteConversation={onDeleteConversation}
        onImport={onImportConversations}
        onExport={onExportConversations}
        onToggleTheme={onToggleTheme}
        onOpenModelSelector={onOpenModelSelector}
        modelStatus={modelStatus}
      />
      <main className="chat__main">
        {!activeConversation ? (
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
