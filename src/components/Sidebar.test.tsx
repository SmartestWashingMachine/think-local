import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import type { Conversation } from '../types/chat';

const mockConversations: Conversation[] = [
  { id: '1', title: 'Chat A', messages: [], createdAt: 1000 },
  { id: '2', title: 'Chat B', messages: [], createdAt: 2000 },
];

describe('Sidebar', () => {
  const defaultProps = {
    conversations: mockConversations,
    activeId: '1',
    theme: 'light' as const,
    currentView: 'chat' as const,
    onNewChat: vi.fn(),
    onSelectConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onImport: vi.fn(),
    onExport: vi.fn(() => []),
    onToggleTheme: vi.fn(),
    onOpenModelSelector: vi.fn(),
    onNavigate: vi.fn(),
    modelStatus: 'idle',
  };

  it('renders the app title', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Think Local')).toBeInTheDocument();
  });

  it('renders a "New Chat" button', () => {
    render(<Sidebar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /New Chat/ }),
    ).toBeInTheDocument();
  });

  it('renders conversation items', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Chat A')).toBeInTheDocument();
    expect(screen.getByText('Chat B')).toBeInTheDocument();
  });

  it('calls onNewChat when the New Chat button is clicked', async () => {
    const onNewChat = vi.fn();
    render(<Sidebar {...defaultProps} onNewChat={onNewChat} />);
    await userEvent.click(screen.getByRole('button', { name: /New Chat/ }));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectConversation when a conversation is clicked', async () => {
    const onSelectConversation = vi.fn();
    render(
      <Sidebar {...defaultProps} onSelectConversation={onSelectConversation} />,
    );
    await userEvent.click(screen.getByText('Chat A'));
    expect(onSelectConversation).toHaveBeenCalledWith('1');
  });

  it('renders Import and Export buttons', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('shows "Dark mode" text when theme is light', () => {
    render(<Sidebar {...defaultProps} theme="light" />);
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('shows "Light mode" text when theme is dark', () => {
    render(<Sidebar {...defaultProps} theme="dark" />);
    expect(screen.getByText('Light mode')).toBeInTheDocument();
  });

  it('calls onToggleTheme when theme button is clicked', async () => {
    const onToggleTheme = vi.fn();
    render(<Sidebar {...defaultProps} onToggleTheme={onToggleTheme} />);
    await userEvent.click(screen.getByText('Dark mode'));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders Chats and RAG page buttons', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Chats')).toBeInTheDocument();
    expect(screen.getByText('RAG')).toBeInTheDocument();
  });

  it('calls onNavigate with chat when Chats button is clicked', async () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByText('Chats'));
    expect(onNavigate).toHaveBeenCalledWith('chat');
  });

  it('calls onNavigate with rag when RAG button is clicked', async () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByText('RAG'));
    expect(onNavigate).toHaveBeenCalledWith('rag');
  });

  it('highlights active page button', () => {
    const { rerender } = render(<Sidebar {...defaultProps} currentView="rag" />);
    expect(screen.getByText('RAG').closest('button')).toHaveClass('sidebar__page-btn--active');

    rerender(<Sidebar {...defaultProps} currentView="chat" />);
    expect(screen.getByText('Chats').closest('button')).toHaveClass('sidebar__page-btn--active');
  });


});
