import { useRef } from 'react';
import type { Conversation, ViewState } from '../types/chat';
import './Sidebar.css';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  theme: 'light' | 'dark';
  currentView: ViewState;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onImport: (conversations: Conversation[]) => void;
  onExport: () => Conversation[];
  onToggleTheme: () => void;
  onOpenModelSelector: () => void;
  onOpenEmbeddingModelSelector: () => void;
  onOpenAddDocuments: () => void;
  onNavigate: (view: ViewState) => void;
  modelStatus: string;
  embeddingModelStatus: string;
}

export default function Sidebar({
  conversations,
  activeId,
  theme,
  currentView,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onImport,
  onExport,
  onToggleTheme,
  onOpenModelSelector,
  onOpenEmbeddingModelSelector,
  onOpenAddDocuments,
  onNavigate,
  modelStatus,
  embeddingModelStatus,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          onImport(data as Conversation[]);
        } else if (data.conversations && Array.isArray(data.conversations)) {
          onImport(data.conversations as Conversation[]);
        }
      } catch {
        // silent fail for invalid files
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExportClick() {
    const data = onExport();
    if (data.length === 0) return;
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), conversations: data }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secret-chatter-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2 className="sidebar__title">Secret Chatter</h2>
      </div>

      <div className="sidebar__pages">
        <button
          className={`sidebar__page-btn ${currentView === 'chat' ? 'sidebar__page-btn--active' : ''}`}
          onClick={() => onNavigate('chat')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Chats
        </button>
        <button
          className={`sidebar__page-btn ${currentView === 'rag' ? 'sidebar__page-btn--active' : ''}`}
          onClick={() => onNavigate('rag')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          RAG
        </button>
      </div>

      <button className="sidebar__new-chat" onClick={onNewChat} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Chat
      </button>

      <nav className="sidebar__conversations">
        {conversations.length === 0 && (
          <p className="sidebar__empty">No conversations yet</p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`sidebar__item ${conv.id === activeId ? 'sidebar__item--active' : ''}`}
            onClick={() => onSelectConversation(conv.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelectConversation(conv.id); }}
          >
            <span className="sidebar__item-title">{conv.title}</span>
            <button
              className="sidebar__item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conv.id);
              }}
              type="button"
              aria-label={`Delete ${conv.title}`}
              title="Delete conversation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button className="sidebar__model-btn" onClick={onOpenModelSelector} type="button" title="Manage models">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>Models</span>
          {modelStatus === 'loaded' && <span className="sidebar__model-dot sidebar__model-dot--loaded" />}
          {(modelStatus === 'downloading' || modelStatus === 'loading') && <span className="sidebar__model-dot sidebar__model-dot--busy" />}
        </button>
        <div className="sidebar__io-buttons">
          <button className="sidebar__io-btn" onClick={handleImportClick} type="button" title="Import conversations">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import
          </button>
          <button className="sidebar__io-btn" onClick={handleExportClick} type="button" title="Export conversations">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Export
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="sidebar__theme-btn" onClick={onToggleTheme} type="button" title="Toggle theme">
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>

        <div className="sidebar__rag-section">
          <button className="sidebar__embd-btn" onClick={onOpenEmbeddingModelSelector} type="button" title="Embedding model">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Embedding Model</span>
            {embeddingModelStatus === 'loaded' && <span className="sidebar__model-dot sidebar__model-dot--loaded" />}
            {(embeddingModelStatus === 'downloading' || embeddingModelStatus === 'loading') && <span className="sidebar__model-dot sidebar__model-dot--busy" />}
          </button>
          <button className="sidebar__add-docs-btn" onClick={onOpenAddDocuments} type="button" title="Add documents">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Add documents
          </button>
        </div>
      </div>
    </aside>
  );
}
