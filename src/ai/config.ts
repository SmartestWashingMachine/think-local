export const WLLAMA_CONFIG_PATHS = {
  default: 'https://cdn.jsdelivr.net/npm/@wllama/wllama@3.4.1/src/wasm/wllama.wasm',
};

export const HUGGINGFACE_BASE = 'https://huggingface.co';

export function buildHFDownloadUrl(repo: string, file: string): string {
  return `${HUGGINGFACE_BASE}/${repo}/resolve/main/${file}`;
}
