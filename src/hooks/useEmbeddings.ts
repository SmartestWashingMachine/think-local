import { useCallback, useEffect, useRef, useState } from 'react';
import { Wllama } from '@wllama/wllama/esm/index.js';
import type { ModelInfo, ModelStatus } from '../ai/types';
import { registerGenerateEmbedding } from '../ai/embeddings';
import { saveEmbeddingModelId, getSavedEmbeddingModelId, parseModelId, formatModelId } from '../ai/models';
import { WLLAMA_CONFIG_PATHS, buildHFDownloadUrl } from '../ai/config';

export function useEmbeddings() {
  const wllamaRef = useRef<Wllama | null>(null);
  const [status, setStatus] = useState<ModelStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loadedModel, setLoadedModel] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      wllamaRef.current?.exit().catch(() => {});
      wllamaRef.current = null;
    };
  }, []);

  const loadModel = useCallback(async (info: ModelInfo) => {
    if (wllamaRef.current) {
      await wllamaRef.current.exit();
    }
    wllamaRef.current = new Wllama(WLLAMA_CONFIG_PATHS);

    const url = buildHFDownloadUrl(info.repo, info.file);
    setStatus('downloading');
    setDownloadProgress(0);
    setError(null);

    try {
      await wllamaRef.current.loadModelFromUrl(url, {
        useCache: true,
        embeddings: true,
        pooling_type: 'LLAMA_POOLING_TYPE_MEAN',
        n_ctx: 1024,
        n_batch: 1024,
        progressCallback: (progress) => {
          if (progress.total > 0) {
            setDownloadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
      });
      setLoadedModel(info);
      setStatus('loaded');
      saveEmbeddingModelId(formatModelId(info.repo, info.file));
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    const saved = getSavedEmbeddingModelId();
    if (!saved) return;
    const parsed = parseModelId(saved);
    if (!parsed) return;
    const info = { repo: parsed.repo, file: parsed.file, label: `${parsed.repo}/${parsed.file}` };
    setTimeout(() => loadModel(info), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unloadModel = useCallback(async () => {
    if (wllamaRef.current) {
      await wllamaRef.current.exit();
    }
    wllamaRef.current = null;
    setLoadedModel(null);
    setStatus('idle');
    setError(null);
    setDownloadProgress(0);
    saveEmbeddingModelId(null);
  }, []);

  const generateEmbedding = useCallback(async (text: string): Promise<number[]> => {
    const wllama = wllamaRef.current;
    if (!wllama || !wllama.isModelLoaded()) {
      throw new Error('No embedding model loaded');
    }
    const result = await wllama.createEmbedding({ input: text }) as { data: { embedding: unknown[] }[] };
    return result.data[0].embedding as number[];
  }, []);

  const isModelLoaded = useCallback((): boolean => {
    return wllamaRef.current !== null && wllamaRef.current.isModelLoaded();
  }, []);

  useEffect(() => {
    registerGenerateEmbedding(generateEmbedding);
  }, [generateEmbedding]);

  return {
    status,
    downloadProgress,
    loadedModel,
    error,
    loadModel,
    unloadModel,
    generateEmbedding,
    isModelLoaded,
  };
}
