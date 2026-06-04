import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Chat from './Chat';
import type { Conversation } from '../types/chat';
import { RAG_FIRST_MESSAGE_TEMPLATE, RAG_DEFAULT_TEMPLATE } from '../constants/rag';

vi.mock('./RagView', () => ({
  default: ({ documents }: { documents: unknown[] }) => (
    <div data-testid="rag-view">Mock RagView (docs: {documents.length})</div>
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
    onSendMessage: vi.fn(),
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

  it('renders sidebar and message area', () => {
    render(<Chat {...defaultProps} />);
    expect(screen.getByText('Secret Chatter')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Type your message…'),
    ).toBeInTheDocument();
  });

  it('shows empty state when no active conversation', () => {
    render(<Chat {...defaultProps} activeConversation={null} activeId={null} />);
    expect(
      screen.getByText(
        'Select a conversation or create a new one to start chatting.',
      ),
    ).toBeInTheDocument();
  });

  it('sends a message and clears the input', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<Chat {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Test message');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('renders RagView when view is rag', () => {
    render(<Chat {...defaultProps} view="rag" />);
    expect(screen.getByTestId('rag-view')).toBeInTheDocument();
  });

  it('does not render message input when view is rag', () => {
    render(<Chat {...defaultProps} view="rag" />);
    expect(
      screen.queryByPlaceholderText('Type your message…'),
    ).not.toBeInTheDocument();
  });

  it('sends message without RAG template when RAG is disabled', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<Chat {...defaultProps} onSendMessage={onSendMessage} />);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSendMessage).toHaveBeenCalledWith('Hello');
  });

  it('sends first message with RAG_FIRST_MESSAGE_TEMPLATE when RAG is enabled', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(<Chat {...defaultProps} onSendMessage={onSendMessage} />);

    const ragButton = screen.getByTitle('RAG is disabled — click to enable');
    await user.click(ragButton);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSendMessage).toHaveBeenCalledWith(RAG_FIRST_MESSAGE_TEMPLATE('Hello'));
  });

  it('sends subsequent messages with RAG_DEFAULT_TEMPLATE when RAG is enabled', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    const convoWithMessages: Conversation = {
      ...mockConversation,
      messages: [
        { id: 'm1', role: 'user', content: 'Hi', createdAt: Date.now() },
        { id: 'm2', role: 'assistant', content: 'Hello!', createdAt: Date.now() },
      ],
    };

    render(
      <Chat
        {...defaultProps}
        activeConversation={convoWithMessages}
        onSendMessage={onSendMessage}
      />,
    );

    const ragButton = screen.getByTitle('RAG is disabled — click to enable');
    await user.click(ragButton);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Tell me more');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSendMessage).toHaveBeenCalledWith(RAG_DEFAULT_TEMPLATE('Tell me more'));
  });

  it('calls onAugmentWithRag for first message when RAG is enabled', async () => {
    const onSendMessage = vi.fn();
    const onAugmentWithRag = vi.fn().mockResolvedValue('augmented response');
    const user = userEvent.setup();

    render(
      <Chat
        {...defaultProps}
        onSendMessage={onSendMessage}
        onAugmentWithRag={onAugmentWithRag}
      />,
    );

    const ragButton = screen.getByTitle('RAG is disabled — click to enable');
    await user.click(ragButton);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'What is RAG?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onAugmentWithRag).toHaveBeenCalledWith('What is RAG?');
    expect(onSendMessage).toHaveBeenCalledWith('augmented response');
  });

  it('does not call onAugmentWithRag for subsequent messages', async () => {
    const onSendMessage = vi.fn();
    const onAugmentWithRag = vi.fn().mockResolvedValue('augmented');
    const user = userEvent.setup();

    const convoWithMessages: Conversation = {
      ...mockConversation,
      messages: [
        { id: 'm1', role: 'user', content: 'Hi', createdAt: Date.now() },
        { id: 'm2', role: 'assistant', content: 'Hello!', createdAt: Date.now() },
      ],
    };

    render(
      <Chat
        {...defaultProps}
        activeConversation={convoWithMessages}
        onSendMessage={onSendMessage}
        onAugmentWithRag={onAugmentWithRag}
      />,
    );

    const ragButton = screen.getByTitle('RAG is disabled — click to enable');
    await user.click(ragButton);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Tell me more');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onAugmentWithRag).not.toHaveBeenCalled();
    expect(onSendMessage).toHaveBeenCalledWith(RAG_DEFAULT_TEMPLATE('Tell me more'));
  });
});
