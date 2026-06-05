import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import AgentGraphView from './AgentGraphView';

const mockSetNodes = vi.fn();
let capturedOnUpdateNodeData: ((nodeId: string, newData: Record<string, unknown>) => void) | null = null;

vi.mock('@xyflow/react', () => ({
  useNodesState: () => [[], mockSetNodes, vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  addEdge: vi.fn((e: Edge, eds: Edge[]) => [...eds, e]),
  ReactFlow: () => null,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  useReactFlow: () => ({ screenToFlowPosition: vi.fn() }),
}));

vi.mock('./GraphCanvas', () => ({
  default: function MockGraphCanvas() {
    return <div data-testid="graph-canvas">Graph Canvas</div>;
  },
}));

vi.mock('./RightPane', () => ({
  default: function MockRightPane({
    onUpdateNodeData,
  }: {
    onUpdateNodeData: (nodeId: string, newData: Record<string, unknown>) => void;
  }) {
    capturedOnUpdateNodeData = onUpdateNodeData;
    return <div data-testid="right-pane">Right Pane</div>;
  },
}));

describe('AgentGraphView', () => {
  const onBack = vi.fn();
  const generateCompletionStream = vi.fn();
  const sendMessage = vi.fn();
  const messages: { id: string; role: 'user' | 'assistant'; content: string; createdAt: number }[] = [];

  beforeEach(() => {
    capturedOnUpdateNodeData = null;
    vi.clearAllMocks();
  });

  it('renders the graph canvas and right pane', () => {
    render(
      <AgentGraphView
        onBack={onBack}
        generateCompletionStream={generateCompletionStream}
        messages={messages}
        sendMessage={sendMessage}
        modelStatus="loaded"
      />,
    );
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('right-pane')).toBeInTheDocument();
  });

  it('passes onUpdateNodeData to RightPane', () => {
    render(
      <AgentGraphView
        onBack={onBack}
        generateCompletionStream={generateCompletionStream}
        messages={messages}
        sendMessage={sendMessage}
        modelStatus="loaded"
      />,
    );
    expect(capturedOnUpdateNodeData).not.toBeNull();
  });

  it('handleUpdateNodeData calls setNodes with a function that updates matching node data', () => {
    const testNode: Node = {
      id: 'node-1',
      type: 'process',
      position: { x: 0, y: 0 },
      selected: true,
      data: { nodeType: 'string-joiner', label: 'Test', joinString: '\n' },
    } as unknown as Node;

    render(
      <AgentGraphView
        onBack={onBack}
        generateCompletionStream={generateCompletionStream}
        messages={messages}
        sendMessage={sendMessage}
        modelStatus="loaded"
      />,
    );

    let capturedUpdater: ((prev: Node[]) => Node[]) | null = null;
    mockSetNodes.mockImplementation((updater: unknown) => {
      if (typeof updater === 'function') {
        capturedUpdater = updater as (prev: Node[]) => Node[];
      }
    });

    capturedOnUpdateNodeData!('node-1', { joinString: ', ' });

    expect(mockSetNodes).toHaveBeenCalled();

    const result = capturedUpdater!([testNode]);
    const updatedData = result[0].data as Record<string, unknown>;
    expect(updatedData.joinString).toBe(', ');
    expect(updatedData.label).toBe('Test');
  });

  it('handleUpdateNodeData does not modify other nodes', () => {
    const node1: Node = {
      id: 'node-1',
      type: 'process',
      position: { x: 0, y: 0 },
      selected: true,
      data: { nodeType: 'string-joiner', label: 'Node 1', joinString: '\n' },
    } as unknown as Node;
    const node2: Node = {
      id: 'node-2',
      type: 'process',
      position: { x: 100, y: 100 },
      selected: false,
      data: { nodeType: 'llm', label: 'Node 2' },
    } as unknown as Node;

    render(
      <AgentGraphView
        onBack={onBack}
        generateCompletionStream={generateCompletionStream}
        messages={messages}
        sendMessage={sendMessage}
        modelStatus="loaded"
      />,
    );

    let capturedUpdater: ((prev: Node[]) => Node[]) | null = null;
    mockSetNodes.mockImplementation((updater: unknown) => {
      if (typeof updater === 'function') {
        capturedUpdater = updater as (prev: Node[]) => Node[];
      }
    });

    capturedOnUpdateNodeData!('node-1', { joinString: '|' });

    const result = capturedUpdater!([node1, node2]);
    expect((result[0].data as Record<string, unknown>).joinString).toBe('|');
    expect((result[1].data as Record<string, unknown>).label).toBe('Node 2');
  });
});
