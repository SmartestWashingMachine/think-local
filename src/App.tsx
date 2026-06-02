import { useState } from 'react';
import type { ViewState } from './types/chat';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import Landing from './components/Landing';
import Chat from './components/Chat';
import './App.css';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    importConversations,
    exportConversations,
  } = useConversations();

  return (
    <>
      {view === 'landing' ? (
        <Landing onStart={() => setView('chat')} />
      ) : (
        <Chat
          theme={theme}
          onToggleTheme={toggleTheme}
          conversations={conversations}
          activeId={activeId}
          activeConversation={activeConversation}
          onCreateConversation={createConversation}
          onSwitchConversation={switchConversation}
          onDeleteConversation={deleteConversation}
          onSendMessage={sendMessage}
          onImportConversations={importConversations}
          onExportConversations={exportConversations}
        />
      )}
    </>
  );
}
