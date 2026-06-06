let _impl: ((text: string) => Promise<number[]>) | null = null;

export function registerGenerateEmbedding(fn: (text: string) => Promise<number[]>): void {
  _impl = fn;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!_impl) {
    throw new Error('No embedding model loaded');
  }
  return _impl(text);
}

export function isLoaded(): boolean {
  return _impl !== null;
}
