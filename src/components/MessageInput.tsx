import { type FormEvent, type KeyboardEvent, useRef } from 'react';
import './MessageInput.css';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  ragEnabled?: boolean;
  onToggleRag?: () => void;
}

export default function MessageInput({ onSend, disabled = false, ragEnabled = false, onToggleRag }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  function send() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const content = textarea.value.trim();
    if (!content || disabled) return;
    onSend(content);
    textarea.value = '';
    textarea.style.height = 'auto';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleInput() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      {onToggleRag && (
        <div className="message-input__rag-bar">
          <button
            type="button"
            className={`message-input__rag-toggle${ragEnabled ? ' message-input__rag-toggle--active' : ''}`}
            onClick={onToggleRag}
            title={ragEnabled ? 'RAG is enabled — click to disable' : 'RAG is disabled — click to enable'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <span>RAG</span>
            <span className={`message-input__rag-dot${ragEnabled ? ' message-input__rag-dot--active' : ''}`} />
          </button>
        </div>
      )}
      <div className="message-input__input-row">
        <textarea
          ref={textareaRef}
          className="message-input__field"
          rows={1}
          placeholder="Type your message…"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
        />
        <button
          className="message-input__send"
          type="submit"
          disabled={disabled}
          aria-label="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </form>
  );
}
