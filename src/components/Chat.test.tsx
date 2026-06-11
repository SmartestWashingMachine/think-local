import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Chat from './Chat';
import type { Conversation } from '../types/chat';

vi.mock('./RagView', () => ({
  default: ({ documents }: { documents: unknown[] }) => (
    <div data-testid="rag-view">Mock RagView (docs: {documents.length})</div>
  ),
}));

vi.mock('./AgentGraph/AgentChat', () => ({
  default: ({ messages, onClearChat }: { messages: unknown[]; onClearChat: () => void }) => (
    <div data-testid="agent-chat">
      <button onClick={onClearChat} type="button">Clear</button>
      <span data-testid="msg-count">{messages.length} messages</span>
    </div>
  ),
}));

const mockConversation: Conversation = {
  id: '1',
  title: 'Test Chat',
  messages: [],
  createdAt: Date.now(),
};

describe('Chat', () => {
  const defaultProps = {
    theme: 'light' as const,
    view: 'chat' as const,
    onToggleTheme: vi.fn(),
    conversations: [mockConversation],
    activeId: '1',
    activeConversation: mockConversation,
    onCreateConversation: vi.fn(() => 'new-id'),
    onSwitchConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onImportConversations: vi.fn(),
    onExportConversations: vi.fn(() => []),
    onOpenModelSelector: vi.fn(),
    onOpenEmbeddingModelSelector: vi.fn(),
    onOpenAddDocuments: vi.fn(),
    onNavigate: vi.fn(),
    modelStatus: 'idle',
    embeddingModelStatus: 'idle',
    ragDocuments: [],
  };

  it('renders sidebar and agent chat area', () => {
    render(<Chat {...defaultProps} />);
    expect(screen.getByText('Think Local')).toBeInTheDocument();
    expect(screen.getByTestId('agent-chat')).toBeInTheDocument();
  });

  it('shows empty state when no active conversation', () => {
    render(<Chat {...defaultProps} activeConversation={null} activeId={null} />);
    expect(
      screen.getByText(
        'Select a conversation or create a new one to start chatting.',
      ),
    ).toBeInTheDocument();
  });

  it('renders RagView when view is rag', () => {
    render(<Chat {...defaultProps} view="rag" />);
    expect(screen.getByTestId('rag-view')).toBeInTheDocument();
  });

  it('does not render agent chat when view is rag', () => {
    render(<Chat {...defaultProps} view="rag" />);
    expect(
      screen.queryByTestId('agent-chat'),
    ).not.toBeInTheDocument();
  });
});
