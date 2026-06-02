import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MessageList from './MessageList';
import type { Message } from '../types/chat';

describe('MessageList', () => {
  it('shows an empty state when there are no messages', () => {
    render(<MessageList messages={[]} />);
    expect(
      screen.getByText('Start a conversation by typing a message below.'),
    ).toBeInTheDocument();
  });

  it('renders user and assistant messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        createdAt: Date.now(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
        createdAt: Date.now(),
      },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('renders the correct number of messages', () => {
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'A', createdAt: 1 },
      { id: '2', role: 'assistant', content: 'B', createdAt: 2 },
      { id: '3', role: 'user', content: 'C', createdAt: 3 },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
