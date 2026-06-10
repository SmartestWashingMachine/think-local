import { useState, useCallback } from 'react';
import type { ViewState } from './types/chat';
import { useTheme } from './hooks/useTheme';
import { useConversations } from './hooks/useConversations';
import { useAI } from './hooks/useAI';
import { useEmbeddings } from './hooks/useEmbeddings';
import { useVectorStore } from './hooks/useVectorStore';
import type { Message } from './types/chat';
import type { ChatCompletionMessage } from '@wllama/wllama/esm/types/oai-compat';
import { RAG_DEFAULT_TOP_K, buildRagAugmentedMessage, RAG_FIRST_MESSAGE_TEMPLATE } from './constants/rag';
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
    searchDocuments,
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

  const handleSendMessage = useCallback(
    async (content: string) => {
      await sendMessage(content, async (history: Message[], onToken, setAssistantContent) => {
        setAssistantContent('');
        return generateCompletionStream(
          history.map((m) => ({ role: m.role, content: m.content } as ChatCompletionMessage)),
          onToken,
        );
      });
    },
    [sendMessage, generateCompletionStream],
  );

  const handleAugmentWithRag = useCallback(async (query: string): Promise<string> => {
    try {
      const embedding = await generateEmbedding(query);
      const results = searchDocuments(embedding, RAG_DEFAULT_TOP_K);
      if (results.length === 0) return RAG_FIRST_MESSAGE_TEMPLATE(query);
      const context = results.map((r) => r.document.content).join('\n\n---\n\n');
      return buildRagAugmentedMessage(query, context);
    } catch {
      return RAG_FIRST_MESSAGE_TEMPLATE(query);
    }
  }, [generateEmbedding, searchDocuments]);

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
          onSendMessage={handleSendMessage}
          sendMessage={sendMessage}
          generateCompletionStream={generateCompletionStream}
          generateCompletionWithTools={generateCompletionWithTools}
          onAugmentWithRag={handleAugmentWithRag}
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
