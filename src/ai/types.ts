export type ModelStatus = 'idle' | 'downloading' | 'loading' | 'loaded' | 'error';

export interface ModelInfo {
  repo: string;
  file: string;
  label: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
}

export type ModelId = `${string}/${string}`;
