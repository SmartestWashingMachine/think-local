import type { StoredDocument, SearchResult } from '../types/rag';

interface DocRecord {
  id: string;
  filename: string;
  content: string;
  dateAdded: number;
  embedding: number[];
}

const DB_NAME = 'secret-chatter-rag';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbPromise: Promise<IDBDatabase> | null = null;
let cache: DocRecord[] = [];

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export async function loadCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      cache = request.result ?? [];
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addDocument(doc: StoredDocument, embedding: number[]): Promise<void> {
  const record: DocRecord = { id: doc.id, filename: doc.filename, content: doc.content, dateAdded: doc.dateAdded, embedding };
  cache.push(record);
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(record);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getAll(): StoredDocument[] {
  return cache.map((record) => ({
    id: record.id,
    filename: record.filename,
    content: record.content,
    dateAdded: record.dateAdded,
  }));
}

export function search(queryEmbedding: number[], topK: number = 5): SearchResult[] {
  const scored = cache.map((record) => ({
    document: {
      id: record.id,
      filename: record.filename,
      content: record.content,
      dateAdded: record.dateAdded,
    },
    score: cosineSimilarity(queryEmbedding, record.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function deleteDocument(id: string): Promise<void> {
  cache = cache.filter((d) => d.id !== id);
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}
