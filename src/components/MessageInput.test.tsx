import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MessageInput from './MessageInput';

describe('MessageInput', () => {
  it('renders a textarea and send button', () => {
    render(<MessageInput onSend={() => {}} />);
    expect(
      screen.getByPlaceholderText('Type your message…'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('calls onSend with the textarea content on submit', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Hello, world!');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSend).toHaveBeenCalledWith('Hello, world!');
  });

  it('calls onSend when Enter is pressed (without Shift)', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText('Type your message…');
    await user.type(textarea, 'Hello{Enter}');

    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('does not call onSend when the textarea is empty', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} />);

    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables the textarea and button when disabled is true', () => {
    render(<MessageInput onSend={() => {}} disabled />);
    expect(screen.getByPlaceholderText('Type your message…')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('renders RAG toggle button when onToggleRag is provided', () => {
    render(<MessageInput onSend={() => {}} onToggleRag={() => {}} />);
    expect(screen.getByText('RAG')).toBeInTheDocument();
  });

  it('calls onToggleRag when RAG button is clicked', async () => {
    const onToggleRag = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={() => {}} onToggleRag={onToggleRag} />);

    await user.click(screen.getByText('RAG'));
    expect(onToggleRag).toHaveBeenCalledTimes(1);
  });

  it('does not render RAG toggle when onToggleRag is not provided', () => {
    render(<MessageInput onSend={() => {}} />);
    expect(screen.queryByText('RAG')).not.toBeInTheDocument();
  });
});
