import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { SearchResult } from '../types/rag';
import { useAgentGraphRunner } from './useAgentGraphRunner';

const mockGenerateEmbedding = vi.fn();
const mockVectorSearch = vi.fn();

vi.mock('../ai/embeddings', () => ({
  generateEmbedding: (...args: unknown[]) => mockGenerateEmbedding(...args),
  registerGenerateEmbedding: vi.fn(),
}));

vi.mock('../ai/vectorStore', () => ({
  search: (...args: unknown[]) => mockVectorSearch(...args),
}));

function createMockNodes(types: string[]): Node[] {
  return types.map((type, i) => ({
    id: `node-${i}`,
    type: type === 'user-query' ? 'input' : type === 'if-string-contains' || type === 'if-closest-document' ? 'if' : 'process',
    position: { x: i * 250, y: 200 },
    data: {
      nodeType: type,
      label: `Node ${i}`,
      message: '{text}',
      k: 3,
      containsString: '',
      caseSensitive: true,
      threshold: 0.7,
    },
  })) as unknown as Node[];
}

function createEdges(nodeIds: string[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodeIds[i],
      target: nodeIds[i + 1],
      sourceHandle: 'output',
      targetHandle: 'input',
    } as Edge);
  }
  return edges;
}

describe('useAgentGraphRunner', () => {
  const generateCompletionStream = vi.fn(async () => 'LLM response');
  const onToken = vi.fn();
  const onTrace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RAG node', () => {
    it('returns joined chunks from vector store', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      const results: SearchResult[] = [
        { document: { id: '1', filename: 'a.txt', content: 'chunk one', dateAdded: 0 }, score: 0.9 },
        { document: { id: '2', filename: 'b.txt', content: 'chunk two', dateAdded: 0 }, score: 0.8 },
      ];
      mockVectorSearch.mockReturnValue(results);

      const nodes = createMockNodes(['user-query', 'rag', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockVectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3], 3);
      expect(output).toBe('chunk one\n\n---\n\nchunk two');
    });

    it('returns empty string when vector store returns no results', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([]);

      const nodes = createMockNodes(['user-query', 'rag', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });

    it('returns empty string when embedding fails', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('No model loaded'));

      const nodes = createMockNodes(['user-query', 'rag', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });
  });

  describe('if-string-contains node', () => {
    it('passes input through when substring is found (case sensitive)', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'world', caseSensitive: true };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello world', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('hello world');
    });

    it('returns empty string and stops when substring is not found', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'foo', caseSensitive: true };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello world', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });

    it('passes input through when substring matches case-insensitively', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'WORLD', caseSensitive: false };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello World', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('hello World');
    });

    it('returns empty string when substring does not match case-insensitively', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'foo', caseSensitive: false };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello world', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });
  });

  describe('if-closest-document node', () => {
    it('passes input through when best score meets threshold', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'relevant content', dateAdded: 0 }, score: 0.85 },
      ]);

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('test query');
    });

    it('returns empty string when best score is below threshold', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'irrelevant', dateAdded: 0 }, score: 0.3 },
      ]);

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });

    it('returns empty string when embedding fails', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('No model loaded'));

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });

    it('returns empty string when no documents exist', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([]);

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

      expect(output).toBe('');
    });
  });

  it('stops downstream nodes when IF condition is false', async () => {
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockVectorSearch.mockReturnValue([]);

    const nodes = createMockNodes(['user-query', 'llm', 'if-closest-document', 'llm', 'chat-message']);
    nodes[1].data = { ...nodes[1].data, message: '{text}' };
    nodes[2].data = { ...nodes[2].data, threshold: 0.7 };
    const edges = createEdges(nodes.map((n) => n.id));
    const { result } = renderHook(() => useAgentGraphRunner());

    const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, onTrace);

    expect(generateCompletionStream).toHaveBeenCalledTimes(1);
    expect(output).toBe('');
  });
});
