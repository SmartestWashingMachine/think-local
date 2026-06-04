import { Wllama } from '@wllama/wllama/esm/index.js';
import { WLLAMA_CONFIG_PATHS, buildHFDownloadUrl } from './config';

let wllama: Wllama | null = null;

export async function initEmbeddingModel(
  repo: string,
  file: string,
  onProgress?: (progress: { loaded: number; total: number }) => void,
): Promise<void> {
  if (wllama) {
    await wllama.exit();
    wllama = null;
  }

  wllama = new Wllama(WLLAMA_CONFIG_PATHS);
  const url = buildHFDownloadUrl(repo, file);

  await wllama.loadModelFromUrl(url, {
    useCache: true,
    embeddings: true,
    pooling_type: 'LLAMA_POOLING_TYPE_MEAN',
    n_ctx: 1024,
    n_batch: 1024,
    progressCallback: onProgress,
  });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!wllama || !wllama.isModelLoaded()) {
    throw new Error('No embedding model loaded');
  }
  const result = await wllama.createEmbedding({ input: text }) as { data: { embedding: unknown[] }[] };
  return result.data[0].embedding as number[];
}

export async function unloadModel(): Promise<void> {
  if (wllama) {
    await wllama.exit();
    wllama = null;
  }
}

export function isLoaded(): boolean {
  return wllama !== null && wllama.isModelLoaded();
}
