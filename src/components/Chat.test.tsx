import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Chat from './Chat';
import type { Conversation } from '../types/chat';

const mockConversation: Conversation = {
  id: '1',
  title: 'Test Chat',
  messages: [],
  createdAt: Date.now(),
};

describe('Chat', () => {
  const defaultProps = {
    theme: 'light' as const,
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
});
