import { useState, useEffect, useCallback, useRef } from 'react';
import type { StoredDocument, SearchResult } from '../types/rag';
import * as vectorStore from '../ai/vectorStore';

export function useVectorStore() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    vectorStore.loadCache().then(() => {
      setDocuments(vectorStore.getAll());
      setLoaded(true);
    });
  }, []);

  const addDocuments = useCallback(async (
    files: File[],
    embedFn: (text: string) => Promise<number[]>,
    onProgress?: (current: number, total: number) => void,
  ): Promise<void> => {
    for (let i = 0; i < files.length; i++) {
      const text = await readFileAsText(files[i]);
      const embedding = await embedFn(text);
      const doc: StoredDocument = {
        id: crypto.randomUUID(),
        filename: files[i].name,
        content: text,
        dateAdded: Date.now(),
      };
      await vectorStore.addDocument(doc, embedding);
      onProgress?.(i + 1, files.length);
    }
    setDocuments(vectorStore.getAll());
  }, []);

  const removeDocument = useCallback(async (id: string) => {
    await vectorStore.deleteDocument(id);
    setDocuments(vectorStore.getAll());
  }, []);

  const searchDocuments = useCallback((embedding: number[], topK: number = 5): SearchResult[] => {
    return vectorStore.search(embedding, topK);
  }, []);

  return {
    documents,
    loaded,
    addDocuments,
    removeDocument,
    searchDocuments,
  };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
