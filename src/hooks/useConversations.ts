import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Conversation, Message } from '../types/chat';
import { DUMMY_RESPONSE, STORAGE_KEYS } from '../constants/chat';

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.conversations);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Conversation[];
  } catch {
    return [];
  }
}

function loadActiveId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.activeId);
}

function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
}

function saveActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.activeId, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeId);
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(loadActiveId);

  // Persist whenever conversations change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Persist active ID whenever it changes
  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  // Auto-create a default conversation on first visit (empty localStorage)
  useEffect(() => {
    if (conversations.length === 0) {
      const id = generateId();
      const newConvo: Conversation = {
        id,
        title: 'New conversation',
        messages: [],
        createdAt: Date.now(),
      };
      setConversations([newConvo]);
      setActiveId(id);
    }
    // Only run once on mount — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const createConversation = useCallback((): string => {
    const id = generateId();
    const newConvo: Conversation = {
      id,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const switchConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId((prev) => (prev === id ? null : prev));
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeId) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        createdAt: Date.now(),
      };

      // Add user message and auto-generate title if first message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const updated = {
            ...c,
            messages: [...c.messages, userMessage],
          };
          // Auto-title from first user message
          if (c.messages.length === 0) {
            updated.title = content.length > 40 ? `${content.slice(0, 40)}…` : content;
          }
          return updated;
        }),
      );

      // Simulate delay then add dummy response
      await new Promise((r) => setTimeout(r, 1000));

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: DUMMY_RESPONSE,
        createdAt: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          return { ...c, messages: [...c.messages, assistantMessage] };
        }),
      );
    },
    [activeId],
  );

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  }, []);

  const importConversations = useCallback((imported: Conversation[]) => {
    setConversations((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const newOnes = imported.filter((c) => !existingIds.has(c.id));
      if (newOnes.length === 0) return prev;
      return [...newOnes, ...prev];
    });
  }, []);

  const exportConversations = useCallback((): Conversation[] => {
    return conversations;
  }, [conversations]);

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    switchConversation,
    deleteConversation,
    sendMessage,
    renameConversation,
    importConversations,
    exportConversations,
  };
}
