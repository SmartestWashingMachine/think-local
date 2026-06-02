import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useConversations } from './useConversations';
import { DUMMY_RESPONSE, STORAGE_KEYS } from '../constants/chat';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useConversations', () => {
  it('starts with a default conversation when no data is stored', () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeId).toBe(result.current.conversations[0].id);
    expect(result.current.activeConversation).not.toBeNull();
    expect(result.current.activeConversation?.title).toBe('New conversation');
    expect(result.current.activeConversation?.messages).toEqual([]);
  });

  it('loads existing conversations from localStorage and does not auto-create', () => {
    const existing = [
      { id: 'existing-1', title: 'Saved Chat', messages: [], createdAt: 1000 },
    ];
    localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(existing));
    localStorage.setItem(STORAGE_KEYS.activeId, 'existing-1');

    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].title).toBe('Saved Chat');
    expect(result.current.activeId).toBe('existing-1');
  });

  it('creates a new conversation', () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });

    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.activeId).toBe(result.current.conversations[0].id);
    expect(result.current.conversations[0].title).toBe('New conversation');
    expect(result.current.conversations[0].messages).toEqual([]);
  });

  it('switches between conversations', () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });
    const id1 = result.current.conversations[0].id;

    act(() => {
      result.current.createConversation();
    });
    const id2 = result.current.conversations[0].id;

    expect(result.current.activeId).toBe(id2);

    act(() => {
      result.current.switchConversation(id1);
    });
    expect(result.current.activeId).toBe(id1);

    act(() => {
      result.current.switchConversation(id2);
    });
    expect(result.current.activeId).toBe(id2);
  });

  it('deletes a conversation', () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });
    const id = result.current.conversations[0].id;
    expect(result.current.conversations).toHaveLength(2);

    act(() => {
      result.current.deleteConversation(id);
    });
    // The auto-created default conversation remains
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeId).toBeNull();
  });

  it('sends a message and adds a dummy response', async () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });

    await act(async () => {
      await result.current.sendMessage('Hello!');
    });

    const conv = result.current.activeConversation!;
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[0].role).toBe('user');
    expect(conv.messages[0].content).toBe('Hello!');
    expect(conv.messages[1].role).toBe('assistant');
    expect(conv.messages[1].content).toBe(DUMMY_RESPONSE);
  });

  it('auto-generates the conversation title from the first message', async () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });

    await act(async () => {
      await result.current.sendMessage('What is the meaning of life?');
    });

    expect(result.current.activeConversation!.title).toBe(
      'What is the meaning of life?',
    );
  });

  it('truncates long titles from the first message', async () => {
    const { result } = renderHook(() => useConversations());
    const longMessage = 'a'.repeat(100);

    act(() => {
      result.current.createConversation();
    });

    await act(async () => {
      await result.current.sendMessage(longMessage);
    });

    expect(result.current.activeConversation!.title).toBe(
      `${'a'.repeat(40)}…`,
    );
  });

  it('persists conversations to localStorage', () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });

    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.conversations) || '[]',
    );
    expect(stored).toHaveLength(2);
    expect(stored[0].title).toBe('New conversation');
  });

  it('loads conversations from localStorage on init', () => {
    const existing = [
      {
        id: 'preloaded-1',
        title: 'Preloaded Chat',
        messages: [],
        createdAt: 1000,
      },
    ];
    localStorage.setItem(
      STORAGE_KEYS.conversations,
      JSON.stringify(existing),
    );
    localStorage.setItem(STORAGE_KEYS.activeId, 'preloaded-1');

    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.activeId).toBe('preloaded-1');
    expect(result.current.activeConversation?.title).toBe('Preloaded Chat');
  });

  it('imports conversations that do not already exist', () => {
    const { result } = renderHook(() => useConversations());
    const imported = [
      {
        id: 'imported-1',
        title: 'Imported Chat',
        messages: [],
        createdAt: 3000,
      },
    ];

    act(() => {
      result.current.importConversations(imported);
    });

    // Auto-created default + imported
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0].title).toBe('Imported Chat');
  });

  it('does not import duplicate conversations', () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });
    const existingId = result.current.conversations[0].id;

    const duplicates = [
      {
        id: existingId,
        title: 'Duplicate',
        messages: [],
        createdAt: 4000,
      },
    ];

    act(() => {
      result.current.importConversations(duplicates);
    });

    // Auto-created default + created conversation (duplicate not imported)
    expect(result.current.conversations).toHaveLength(2);
  });

  it('exports all conversations', () => {
    const { result } = renderHook(() => useConversations());

    act(() => {
      result.current.createConversation();
    });

    const exported = result.current.exportConversations();
    // Auto-created default + created conversation
    expect(exported).toHaveLength(2);
    expect(exported[0].title).toBe('New conversation');
  });
});
