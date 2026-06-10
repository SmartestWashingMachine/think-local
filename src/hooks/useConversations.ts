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
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const loaded = loadConversations();
    if (loaded.length > 0) return loaded;
    const id = generateId();
    const newConvo: Conversation = {
      id,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
    };
    saveConversations([newConvo]);
    saveActiveId(id);
    return [newConvo];
  });
  const [activeId, setActiveId] = useState<string | null>(loadActiveId);

  // Persist whenever conversations change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Persist active ID whenever it changes
  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

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
    async (
      content: string,
      onStream?: (
        messages: Message[],
        onToken: (token: string) => void,
        setAssistantContent: (content: string) => void,
      ) => Promise<string>,
    ) => {
      if (!activeId || !activeConversation) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        createdAt: Date.now(),
      };

      const messagesAfterUser = [...activeConversation.messages, userMessage];

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const updated: Conversation = {
            ...c,
            messages: messagesAfterUser,
          };
          if (c.messages.length === 0) {
            updated.title = content.length > 40 ? `${content.slice(0, 40)}…` : content;
          }
          return updated;
        }),
      );

      if (onStream) {
        let currentAssistantId: string | null = null;

        const setAssistantContent = (content: string) => {
          if (!currentAssistantId) {
            const id = generateId();
            currentAssistantId = id;
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeId) return c;
                return {
                  ...c,
                  messages: [...c.messages, { id, role: 'assistant', content, createdAt: Date.now() }],
                };
              }),
            );
          } else {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeId) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === currentAssistantId ? { ...m, content } : m,
                  ),
                };
              }),
            );
          }
        };

        const onToken = (token: string) => {
          if (!currentAssistantId) return;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === currentAssistantId ? { ...m, content: (m.content ?? '') + token } : m,
                ),
              };
            }),
          );
        };

        try {
          await onStream(messagesAfterUser, onToken, setAssistantContent);
        } catch {
          if (currentAssistantId) {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== activeId) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === currentAssistantId ? { ...m, content: DUMMY_RESPONSE } : m,
                  ),
                };
              }),
            );
          }
        }
      } else {
        const assistantId = generateId();
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            return {
              ...c,
              messages: [...c.messages, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }],
            };
          }),
        );

        await new Promise((r) => setTimeout(r, 1000));
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: DUMMY_RESPONSE } : m,
              ),
            };
          }),
        );
      }
    },
    [activeId, activeConversation],
  );

  const clearMessages = useCallback(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [] } : c,
      ),
    );
  }, [activeId]);

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

  const updateUserMessageImage = useCallback((messageId: string, imageData: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, imageData } : m,
          ),
        };
      }),
    );
  }, [activeId]);

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
    clearMessages,
    importConversations,
    exportConversations,
    updateUserMessageImage,
  };
}
