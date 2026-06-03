import { useCallback, useEffect, useRef, useState } from 'react';
import { Wllama } from '@wllama/wllama/esm/index.js';
import type { ModelInfo, ModelStatus } from '../ai/types';
import { saveModelId, formatModelId } from '../ai/models';
import { WLLAMA_CONFIG_PATHS, buildHFDownloadUrl } from '../ai/config';

export function useAI() {
  const wllamaRef = useRef<Wllama | null>(null);

  const [status, setStatus] = useState<ModelStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loadedModelInfo, setLoadedModelInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cachedList, setCachedList] = useState<{ url: string; size: number }[]>([]);

  const refreshCachedList = useCallback(async () => {
    const wllama = wllamaRef.current;
    if (!wllama) { setCachedList([]); return; }
    try {
      const models = await wllama.modelManager.getModels();
      setCachedList(models.map((m) => ({ url: m.url, size: m.size })));
    } catch {
      setCachedList([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      wllamaRef.current?.exit().catch(() => {});
      wllamaRef.current = null;
    };
  }, []);

  const getOrCreateWllama = useCallback(async () => {
    if (!wllamaRef.current) {
      wllamaRef.current = new Wllama(WLLAMA_CONFIG_PATHS);
    }
    if (wllamaRef.current.isModelLoaded()) {
      await wllamaRef.current.exit();
    }
  }, []);

  const loadModel = useCallback(async (info: ModelInfo) => {
    const wllama = wllamaRef.current;
    const url = buildHFDownloadUrl(info.repo, info.file);

    const isCached = wllama
      ? (await wllama.modelManager.getModels()).some((m) => m.url === url)
      : false;

    if (isCached) {
      setStatus('loading');
      setError(null);
    } else {
      setStatus('downloading');
      setDownloadProgress(0);
      setError(null);
    }

    await getOrCreateWllama();

    try {
      await wllamaRef.current!.loadModelFromUrl(url, {
        useCache: true,
        progressCallback: (progress) => {
          if (progress.total > 0) {
            setDownloadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
      });

      setLoadedModelInfo(info);
      setStatus('loaded');
      saveModelId(formatModelId(info.repo, info.file));
      await refreshCachedList();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, [getOrCreateWllama, refreshCachedList]);

  const unloadModel = useCallback(async () => {
    if (wllamaRef.current) {
      await wllamaRef.current.exit();
    }
    setLoadedModelInfo(null);
    setStatus('idle');
    setError(null);
    setDownloadProgress(0);
    saveModelId(null);
  }, []);

  const generateCompletionStream = useCallback(async (
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    onToken: (token: string) => void,
  ): Promise<string> => {
    const wllama = wllamaRef.current;
    if (!wllama || !wllama.isModelLoaded()) {
      throw new Error('No model loaded');
    }

    let fullContent = '';

    await wllama.createChatCompletion({
      messages,
      max_tokens: 256,
      temperature: 0.7,
      stream: true,
      onData: (chunk) => {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullContent += delta;
          onToken(delta);
        }
      },
    });

    return fullContent;
  }, []);

  const removeCachedModel = useCallback(async (url: string) => {
    const wllama = wllamaRef.current;
    if (!wllama) return;
    const models = await wllama.modelManager.getModels();
    const target = models.find((m) => m.url === url);
    if (target) {
      await target.remove();
      await refreshCachedList();
    }
  }, [refreshCachedList]);

  return {
    status,
    downloadProgress,
    loadedModel: loadedModelInfo,
    error,
    cachedModels: cachedList,
    loadModel,
    unloadModel,
    generateCompletionStream,
    removeCachedModel,
  };
}
