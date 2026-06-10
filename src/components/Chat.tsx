import type { Conversation, ViewState, Message } from '../types/chat';
import type { ChatCompletionTool, ChatCompletionMessage } from '@wllama/wllama/esm/types/oai-compat';
import type { StoredDocument } from '../types/rag';
import Sidebar from './Sidebar';
import RagView from './RagView';
import AgentGraphView from './AgentGraph/AgentGraphView';
import AgentChat from './AgentGraph/AgentChat';
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
  sendMessage: (
    content: string,
    onStream?: (messages: Message[], onToken: (token: string) => void, setAssistantContent: (content: string) => void) => Promise<string>,
  ) => Promise<void>;
  clearMessages: () => void;
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
  onImportConversations: (conversations: Conversation[]) => void;
  onExportConversations: () => Conversation[];
  updateUserMessageImage: (messageId: string, imageData: string) => void;
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
  sendMessage,
  clearMessages,
  generateCompletionStream,
  generateCompletionWithTools,
  onImportConversations,
  onExportConversations,
  updateUserMessageImage,
  onOpenModelSelector,
  onOpenEmbeddingModelSelector,
  onOpenAddDocuments,
  onNavigate,
  modelStatus,
  embeddingModelStatus,
  ragDocuments,
}: ChatProps) {
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
            generateCompletionWithTools={generateCompletionWithTools}
            messages={activeConversation?.messages ?? []}
            sendMessage={sendMessage}
            updateUserMessageImage={updateUserMessageImage}
            modelStatus={modelStatus}
            onOpenModelSelector={onOpenModelSelector}
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
          <AgentChat
            expanded
            messages={activeConversation.messages}
            sendMessage={sendMessage}
            onClearChat={clearMessages}
            updateUserMessageImage={updateUserMessageImage}
            generateCompletionStream={generateCompletionStream}
            generateCompletionWithTools={generateCompletionWithTools}
            modelStatus={modelStatus}
            onOpenModelSelector={onOpenModelSelector}
          />
        )}
      </main>
    </div>
  );
}
