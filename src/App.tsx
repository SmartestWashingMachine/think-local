import { useState, useCallback } from 'react';
import type { ViewState } from './types/chat';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import { useAI } from './hooks/useAI';
import { useEmbeddings } from './hooks/useEmbeddings';
import { useVectorStore } from './hooks/useVectorStore';
import Landing from './components/Landing';
import Chat from './components/Chat';
import ModelSelector from './components/ModelSelector';
import EmbeddingModelSelector from './components/EmbeddingModelSelector';
import DocumentUploadModal from './components/DocumentUploadModal';
import './App.css';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [embeddingModelSelectorOpen, setEmbeddingModelSelectorOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    status: modelStatus,
    downloadProgress,
    loadedModel,
    cachedModels,
    loadModel,
    generateCompletionStream,
    generateCompletionWithTools,
    webGpuSupported,
  } = useAI();

  const {
    status: embeddingStatus,
    downloadProgress: embeddingDownloadProgress,
    loadedModel: loadedEmbeddingModel,
    loadModel: loadEmbeddingModel,
    generateEmbedding,
  } = useEmbeddings();

  const {
    documents: ragDocuments,
    addDocuments: addRagDocuments,
  } = useVectorStore();

  const {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    clearMessages,
    importConversations,
    exportConversations,
    updateUserMessageImage,
  } = useConversations();

  const handleEmbedDocuments = useCallback(async (
    files: File[],
    onProgress: (current: number, total: number) => void,
  ) => {
    await addRagDocuments(files, (text) => generateEmbedding(text), onProgress);
  }, [addRagDocuments, generateEmbedding]);

  const handleLoadDefaultEmbeddingModel = useCallback(() => {
    loadEmbeddingModel({
      repo: 'CompendiumLabs/bge-base-en-v1.5-gguf',
      file: 'bge-base-en-v1.5-q4_k_m.gguf',
      label: 'BGE Base v1.5 (Q4_K_M, ~133MB)',
    });
  }, [loadEmbeddingModel]);

  return (
    <>
      {view === 'landing' ? (
        <Landing onStart={() => setView('chat')} />
      ) : (
        <Chat
          theme={theme}
          view={view}
          onToggleTheme={toggleTheme}
          conversations={conversations}
          activeId={activeId}
          activeConversation={activeConversation}
          onCreateConversation={createConversation}
          onSwitchConversation={switchConversation}
          onDeleteConversation={deleteConversation}
          sendMessage={sendMessage}
          generateCompletionStream={generateCompletionStream}
          generateCompletionWithTools={generateCompletionWithTools}
          onImportConversations={importConversations}
          onExportConversations={exportConversations}
          clearMessages={clearMessages}
          updateUserMessageImage={updateUserMessageImage}
          onOpenModelSelector={() => setModelSelectorOpen(true)}
          onOpenEmbeddingModelSelector={() => setEmbeddingModelSelectorOpen(true)}
          onOpenAddDocuments={() => setDocumentUploadOpen(true)}
          onNavigate={setView}
          modelStatus={modelStatus}
          embeddingModelStatus={embeddingStatus}
          ragDocuments={ragDocuments}
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
        webGpuSupported={webGpuSupported}
      />
      <EmbeddingModelSelector
        open={embeddingModelSelectorOpen}
        onClose={() => setEmbeddingModelSelectorOpen(false)}
        status={embeddingStatus}
        downloadProgress={embeddingDownloadProgress}
        loadedModel={loadedEmbeddingModel}
        onSelectModel={(info) => {
          loadEmbeddingModel(info);
          setEmbeddingModelSelectorOpen(false);
        }}
      />
      <DocumentUploadModal
        open={documentUploadOpen}
        onClose={() => setDocumentUploadOpen(false)}
        embeddingStatus={embeddingStatus}
        embeddingDownloadProgress={embeddingDownloadProgress}
        embeddingModelLabel={loadedEmbeddingModel?.label ?? null}
        onLoadDefaultModel={handleLoadDefaultEmbeddingModel}
        onOpenModelSelector={() => {
          setDocumentUploadOpen(false);
          setEmbeddingModelSelectorOpen(true);
        }}
        onEmbedDocuments={handleEmbedDocuments}
      />
    </>
  );
}
