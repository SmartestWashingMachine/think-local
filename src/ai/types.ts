export type ModelStatus = 'idle' | 'downloading' | 'loading' | 'loaded' | 'error';

export interface ModelInfo {
  repo: string;
  file: string;
  label: string;
  /** Optional multimodal projection file (mmproj) for vision/audio support */
  mmprojFile?: string;
  /** Optional separate repo for mmproj; defaults to `repo` when omitted */
  mmprojRepo?: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
}

export type ModelId = `${string}/${string}`;
