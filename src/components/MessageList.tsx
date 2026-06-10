import { useEffect, useRef } from 'react';
import type { Message } from '../types/chat';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <p className="message-list__empty-text">
          Start a conversation by typing a message below.
        </p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message message--${msg.role}`}
        >
          <div className="message__bubble">
            {msg.imageData && (
              <img className="message__img" src={msg.imageData} alt="Webcam capture" />
            )}
            <p className="message__content">{msg.content}</p>
            <span className="message__time">{formatTime(msg.createdAt)}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
