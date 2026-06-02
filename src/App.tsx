import { useState, useCallback } from 'react';
import type { ViewState } from './types/chat';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import { useAI } from './hooks/useAI';
import type { Message } from './types/chat';
import Landing from './components/Landing';
import Chat from './components/Chat';
import ModelSelector from './components/ModelSelector';
import './App.css';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    status: modelStatus,
    downloadProgress,
    loadedModel,
    cachedModels,
    loadModel,
    generateCompletion,
  } = useAI();

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

  const handleSendMessage = useCallback(
    async (content: string) => {
      await sendMessage(content, async (history: Message[]) => {
        return generateCompletion(
          history.map((m) => ({ role: m.role, content: m.content })),
        );
      });
    },
    [sendMessage, generateCompletion],
  );

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
          onSendMessage={handleSendMessage}
          onImportConversations={importConversations}
          onExportConversations={exportConversations}
          onOpenModelSelector={() => setModelSelectorOpen(true)}
          modelStatus={modelStatus}
        />
      )}
      <ModelSelector
        open={modelSelectorOpen}
        onClose={() => setModelSelectorOpen(false)}
        status={modelStatus}
        downloadProgress={downloadProgress}
        loadedModel={loadedModel}
        cachedModels={cachedModels}
        onSelectModel={(info) => {
          loadModel(info);
          setModelSelectorOpen(false);
        }}
      />
    </>
  );
}
