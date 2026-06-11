import type { ModelInfo, ModelId } from './types';

export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    repo: 'LiquidAI/LFM2.5-VL-450M-GGUF',
    file: 'LFM2.5-VL-450M-Q4_0.gguf',
    label: 'LFM2.5-VL-450M (Q4_0, vision)',
    mmprojFile: 'mmproj-LFM2.5-VL-450m-Q8_0.gguf',
  },
  {
    repo: 'ggml-org/models',
    file: 'tinyllamas/stories260K.gguf',
    label: 'TinyLlama 260K (demo)',
  },
  {
    repo: 'ngxson/tinyllama_split_test',
    file: 'stories15M-q8_0-00001-of-00003.gguf',
    label: 'TinyLlama 15M (split demo)',
  },
];

export const RECOMMENDED_EMBEDDING_MODELS: ModelInfo[] = [
  {
    repo: 'CompendiumLabs/bge-base-en-v1.5-gguf',
    file: 'bge-base-en-v1.5-q4_k_m.gguf',
    label: 'BGE Base v1.5 (Q4_K_M, ~133MB)',
  },
  {
    repo: 'ggml-org/models',
    file: 'bert-bge-small/ggml-model-f16.gguf',
    label: 'BERT BGE Small (F16, ~67MB)',
  },
];

export const STORAGE_KEY_MODEL = 'secret-chatter-active-model';
export const STORAGE_KEY_EMBEDDING_MODEL = 'secret-chatter-embedding-model';

export function parseModelId(id: string): { repo: string; file: string } | null {
  const parts = id.split('/');
  if (parts.length < 2) return null;
  const repo = parts.slice(0, -1).join('/');
  const file = parts[parts.length - 1];
  if (!repo || !file) return null;
  return { repo, file };
}

export function formatModelId(repo: string, file: string): ModelId {
  return `${repo}/${file}` as ModelId;
}

export function getSavedModelId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_MODEL);
  } catch {
    return null;
  }
}

export function saveModelId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_MODEL, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_MODEL);
    }
  } catch {
    // ignore
  }
}

export function getSavedEmbeddingModelId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_EMBEDDING_MODEL);
  } catch {
    return null;
  }
}

export function saveEmbeddingModelId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_EMBEDDING_MODEL, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_EMBEDDING_MODEL);
    }
  } catch {
    // ignore
  }
}
