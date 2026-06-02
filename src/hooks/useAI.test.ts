import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAI } from './useAI';
import { RECOMMENDED_MODELS, STORAGE_KEY_MODEL } from '../ai/models';

vi.mock('@wllama/wllama/esm/index.js', () => {
  class MockModelManager {
    async getModels() {
      return [];
    }
  }

  class MockWllama {
    modelManager = new MockModelManager();
    private _loaded = false;

    isModelLoaded() {
      return this._loaded;
    }

    async loadModelFromUrl(_url: string, opts?: Record<string, unknown>) {
      const progressCallback = opts?.progressCallback as ((p: { loaded: number; total: number }) => void) | undefined;
      if (progressCallback) {
        progressCallback({ loaded: 50000, total: 100000 });
        progressCallback({ loaded: 100000, total: 100000 });
      }
      this._loaded = true;
    }

    async exit() {
      this._loaded = false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async createChatCompletion(_options: Record<string, unknown>) {
      return {
        choices: [{ message: { content: 'AI response text' } }],
      };
    }
  }

  return { Wllama: MockWllama };
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('useAI', () => {
  it('starts in idle state with no loaded model', () => {
    const { result } = renderHook(() => useAI());
    expect(result.current.status).toBe('idle');
    expect(result.current.loadedModel).toBeNull();
    expect(result.current.downloadProgress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.cachedModels).toEqual([]);
  });

  it('downloads and loads a model, tracking progress', async () => {
    const { result } = renderHook(() => useAI());
    const modelInfo = RECOMMENDED_MODELS[0];

    act(() => {
      result.current.loadModel(modelInfo);
    });

    expect(result.current.status).toBe('downloading');

    await waitFor(() => {
      expect(result.current.status).toBe('loaded');
    });

    expect(result.current.loadedModel).toEqual(modelInfo);
  });

  it('unloads a model and resets state', async () => {
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.loadModel(RECOMMENDED_MODELS[0]);
    });

    expect(result.current.status).toBe('loaded');

    await act(async () => {
      await result.current.unloadModel();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.loadedModel).toBeNull();
  });

  it('generates a completion when a model is loaded', async () => {
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.loadModel(RECOMMENDED_MODELS[0]);
    });

    let response = '';
    await act(async () => {
      response = await result.current.generateCompletion([
        { role: 'user', content: 'Hello' },
      ]);
    });

    expect(response).toBe('AI response text');
  });

  it('persists the active model to localStorage after loading', async () => {
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.loadModel(RECOMMENDED_MODELS[0]);
    });

    const saved = localStorage.getItem(STORAGE_KEY_MODEL);
    expect(saved).toBe(`${RECOMMENDED_MODELS[0].repo}/${RECOMMENDED_MODELS[0].file}`);
  });

  it('throws when generating completion without a loaded model', async () => {
    const { result } = renderHook(() => useAI());

    await expect(async () => {
      await result.current.generateCompletion([
        { role: 'user', content: 'Hello' },
      ]);
    }).rejects.toThrow('No model loaded');
  });
});
