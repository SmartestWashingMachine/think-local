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
    type: type === 'user-query' ? 'input' :
      type === 'if-string-contains' || type === 'if-closest-document' || type === 'logic-and' || type === 'logic-or' ? 'if' :
      type === 'chat-message' ? 'output' : 'process',
    position: { x: i * 250, y: 200 },
    data: {
      nodeType: type,
      label: `Node ${i}`,
      message: '{text}',
      format: '{text}',
      k: 3,
      containsString: '',
      caseSensitive: true,
      threshold: 0.7,
      joinString: '\n',
      inputOrder: [],
      streamOutput: false,
    },
  })) as unknown as Node[];
}

function createEdges(nodeIds: string[], sourceHandle = 'output'): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodeIds[i],
      target: nodeIds[i + 1],
      sourceHandle,
      targetHandle: 'input',
    } as Edge);
  }
  return edges;
}

describe('useAgentGraphRunner', () => {
  const generateCompletionStream = vi.fn(async () => 'LLM response');
  const onToken = vi.fn();
  const setAssistantContent = vi.fn();
  const onTrace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RAG node', () => {
    it('passes chunks through string-joiner', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      const results: SearchResult[] = [
        { document: { id: '1', filename: 'a.txt', content: 'chunk one', dateAdded: 0 }, score: 0.9 },
        { document: { id: '2', filename: 'b.txt', content: 'chunk two', dateAdded: 0 }, score: 0.8 },
      ];
      mockVectorSearch.mockReturnValue(results);

      const nodes = createMockNodes(['user-query', 'rag', 'string-joiner', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith('test query');
      expect(mockVectorSearch).toHaveBeenCalledWith([0.1, 0.2, 0.3], 3);
      expect(output).toBe('chunk one\nchunk two');
    });

    it('returns empty string when vector store returns no results', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([]);

      const nodes = createMockNodes(['user-query', 'rag', 'string-joiner', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });

    it('returns empty string when embedding fails', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('No model loaded'));

      const nodes = createMockNodes(['user-query', 'rag', 'string-joiner', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });
  });

  describe('string-joiner node', () => {
    it('joins RAG chunks with default newline separator', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'chunk one', dateAdded: 0 }, score: 0.9 },
        { document: { id: '2', filename: 'b.txt', content: 'chunk two', dateAdded: 0 }, score: 0.8 },
        { document: { id: '3', filename: 'c.txt', content: 'chunk three', dateAdded: 0 }, score: 0.7 },
      ]);

      const nodes = createMockNodes(['user-query', 'rag', 'string-joiner', 'chat-message']);
      nodes[2].data = { ...nodes[2].data, joinString: '\n' };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('chunk one\nchunk two\nchunk three');
    });

    it('joins RAG chunks with custom separator', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'chunk one', dateAdded: 0 }, score: 0.9 },
        { document: { id: '2', filename: 'b.txt', content: 'chunk two', dateAdded: 0 }, score: 0.8 },
      ]);

      const nodes = createMockNodes(['user-query', 'rag', 'string-joiner', 'chat-message']);
      nodes[2].data = { ...nodes[2].data, joinString: ', ' };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('chunk one, chunk two');
    });

    it('passes single chunk through unchanged', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'only chunk', dateAdded: 0 }, score: 0.9 },
      ]);

      const nodes = createMockNodes(['user-query', 'rag', 'string-joiner', 'chat-message']);
      nodes[2].data = { ...nodes[2].data, joinString: ', ' };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('only chunk');
    });

    it('collates list<string> and string inputs into one joined output', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'RAG item', dateAdded: 0 }, score: 0.9 },
      ]);

      const nodes = createMockNodes(['user-query', 'llm', 'rag', 'string-joiner', 'chat-message']);
      const edges: Edge[] = [
        { id: 'e-uq-llm', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-uq-rag', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-llm-sj', source: 'node-1', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-rag-sj', source: 'node-2', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-sj-cm', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      nodes[3].data = { ...nodes[3].data, joinString: ' | ' };
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'ignored', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(generateCompletionStream).toHaveBeenCalledTimes(1);
      expect(generateCompletionStream).toHaveBeenCalledWith(
        [{ role: 'user', content: 'ignored' }],
        expect.any(Function),
      );
      expect(output).toBe('LLM response | RAG item');
    });

    it('respects inputOrder for collation ordering', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'RAG item', dateAdded: 0 }, score: 0.9 },
      ]);

      const nodes = createMockNodes(['user-query', 'llm', 'rag', 'string-joiner', 'chat-message']);
      const edges: Edge[] = [
        { id: 'e-uq-llm', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-uq-rag', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-llm-sj', source: 'node-1', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-rag-sj', source: 'node-2', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e-sj-cm', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      // Reverse order: RAG edge first, LLM edge second
      nodes[3].data = { ...nodes[3].data, joinString: ' | ', inputOrder: ['e-rag-sj', 'e-llm-sj'] };
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'ignored', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('RAG item | LLM response');
    });
  });

  describe('format-string node', () => {
    it('passes input through with default format', async () => {
      const nodes = createMockNodes(['user-query', 'format-string', 'chat-message']);
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('hello');
    });

    it('formats input with custom template', async () => {
      const nodes = createMockNodes(['user-query', 'format-string', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, format: 'Prefix: {text}' };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'world', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('Prefix: world');
    });

    it('outputs template literal as-is when no {text} placeholder', async () => {
      const nodes = createMockNodes(['user-query', 'format-string', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, format: 'static text' };
      const edges = createEdges(nodes.map((n) => n.id));
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'anything', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('static text');
    });
  });

  describe('if-string-contains node', () => {
    it('passes input through when substring is found (case sensitive)', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'world', caseSensitive: true };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello world', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('hello world');
    });

    it('returns empty string when substring is not found', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'foo', caseSensitive: true };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello world', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });

    it('passes input through when substring matches case-insensitively', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'WORLD', caseSensitive: false };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello World', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('hello World');
    });

    it('returns empty string when substring does not match case-insensitively', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'foo', caseSensitive: false };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello world', generateCompletionStream, onToken, setAssistantContent, onTrace);

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
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('test query');
    });

    it('returns empty string when best score is below threshold', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([
        { document: { id: '1', filename: 'a.txt', content: 'irrelevant', dateAdded: 0 }, score: 0.3 },
      ]);

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });

    it('returns empty string when embedding fails', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('No model loaded'));

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });

    it('returns empty string when no documents exist', async () => {
      mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockVectorSearch.mockReturnValue([]);

      const nodes = createMockNodes(['user-query', 'if-closest-document', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, threshold: 0.7 };
      const edges = createEdges(nodes.map((n) => n.id), 'true');
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });
  });

  it('stops downstream nodes when IF condition is false', async () => {
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockVectorSearch.mockReturnValue([]);

    const nodes = createMockNodes(['user-query', 'llm', 'if-closest-document', 'llm', 'chat-message']);
    nodes[2].data = { ...nodes[2].data, threshold: 0.7 };
    const edges = createEdges(nodes.map((n) => n.id), 'true');
    const { result } = renderHook(() => useAgentGraphRunner());

    const output = await result.current.executeGraph(nodes, edges, 'test query', generateCompletionStream, onToken, setAssistantContent, onTrace);

    expect(generateCompletionStream).toHaveBeenCalledTimes(1);
    expect(output).toBe('');
  });

  it('string-joiner skips canceled inputs and uses the rest', async () => {
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockVectorSearch.mockReturnValue([]);

    const nodes = createMockNodes(['user-query', 'rag', 'if-closest-document', 'string-joiner', 'chat-message']);
    const edges: Edge[] = [
      { id: 'e1', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e3', source: 'node-1', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e4', source: 'node-2', target: 'node-3', sourceHandle: 'true', targetHandle: 'input' },
      { id: 'e5', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'input' },
    ] as Edge[];
    nodes[1].data = { ...nodes[1].data, k: 2 };
    mockVectorSearch.mockReturnValueOnce([
      { document: { id: '1', filename: 'a.txt', content: 'surviving chunk', dateAdded: 0 }, score: 0.9 },
    ]);
    const { result } = renderHook(() => useAgentGraphRunner());

    const output = await result.current.executeGraph(nodes, edges, 'test', generateCompletionStream, onToken, setAssistantContent, onTrace);

    expect(output).toBe('surviving chunk');
  });

  describe('AND gate', () => {
    it('passes value through when all conditions flow', async () => {
      const nodes = createMockNodes(['user-query', 'llm', 'llm', 'llm', 'logic-and', 'chat-message']);
      const edges: Edge[] = [
        { id: 'e1', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e3', source: 'node-0', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e4', source: 'node-1', target: 'node-4', sourceHandle: 'output', targetHandle: 'conditions' },
        { id: 'e5', source: 'node-2', target: 'node-4', sourceHandle: 'output', targetHandle: 'conditions' },
        { id: 'e6', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'value' },
        { id: 'e7', source: 'node-4', target: 'node-5', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(generateCompletionStream).toHaveBeenCalledTimes(3);
      expect(output).toBe('LLM response');
    });

    it('returns null when a condition fails', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'llm', 'logic-and', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'xyz', caseSensitive: true };
      const edges: Edge[] = [
        { id: 'e1', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e3', source: 'node-1', target: 'node-3', sourceHandle: 'true', targetHandle: 'conditions' },
        { id: 'e4', source: 'node-2', target: 'node-3', sourceHandle: 'output', targetHandle: 'value' },
        { id: 'e5', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(generateCompletionStream).toHaveBeenCalledTimes(1);
      expect(output).toBe('');
    });

    it('returns null when no value edge', async () => {
      const nodes = createMockNodes(['user-query', 'llm', 'logic-and', 'chat-message']);
      const edges: Edge[] = [
        { id: 'e1', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'node-1', target: 'node-2', sourceHandle: 'output', targetHandle: 'conditions' },
        { id: 'e3', source: 'node-2', target: 'node-3', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(output).toBe('');
    });
  });

  describe('OR gate', () => {
    it('passes value through when any condition flows', async () => {
      const nodes = createMockNodes(['user-query', 'llm', 'llm', 'logic-or', 'chat-message']);
      const edges: Edge[] = [
        { id: 'e1', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e3', source: 'node-1', target: 'node-3', sourceHandle: 'output', targetHandle: 'conditions' },
        { id: 'e4', source: 'node-2', target: 'node-3', sourceHandle: 'output', targetHandle: 'value' },
        { id: 'e5', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'test', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(generateCompletionStream).toHaveBeenCalledTimes(2);
      expect(output).toBe('LLM response');
    });

    it('returns null when no conditions flow', async () => {
      const nodes = createMockNodes(['user-query', 'if-string-contains', 'llm', 'logic-or', 'chat-message']);
      nodes[1].data = { ...nodes[1].data, containsString: 'xyz', caseSensitive: true };
      const edges: Edge[] = [
        { id: 'e1', source: 'node-0', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'node-0', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e3', source: 'node-1', target: 'node-3', sourceHandle: 'true', targetHandle: 'conditions' },
        { id: 'e4', source: 'node-2', target: 'node-3', sourceHandle: 'output', targetHandle: 'value' },
        { id: 'e5', source: 'node-3', target: 'node-4', sourceHandle: 'output', targetHandle: 'input' },
      ] as Edge[];
      const { result } = renderHook(() => useAgentGraphRunner());

      const output = await result.current.executeGraph(nodes, edges, 'hello', generateCompletionStream, onToken, setAssistantContent, onTrace);

      expect(generateCompletionStream).toHaveBeenCalledTimes(1);
      expect(output).toBe('');
    });
  });
});
