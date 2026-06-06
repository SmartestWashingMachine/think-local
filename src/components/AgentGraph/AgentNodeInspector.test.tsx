import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData } from '../../types/agentGraph';
import AgentNodeInspector from './AgentNodeInspector';

function createMockNode(overrides: Partial<AgentNodeData> = {}): Node {
  return {
    id: 'test-node-1',
    type: 'process',
    position: { x: 0, y: 0 },
    selected: true,
    data: {
      nodeType: 'string-joiner',
      label: 'My Joiner',
      joinString: '\n',
      inputOrder: [],
      ...overrides,
    } as unknown as AgentNodeData,
  } as unknown as Node;
}

function createMockEdges(sourceIds: string[] = []): Edge[] {
  return sourceIds.map((src, i) => ({
    id: `edge-${i}`,
    source: src,
    target: 'test-node-1',
    sourceHandle: 'output',
    targetHandle: 'input',
  })) as unknown as Edge[];
}

function createMockNodes(labels: Record<string, string> = {}): Node[] {
  return Object.entries(labels).map(([id, label]) => ({
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { nodeType: 'llm', label } as unknown as AgentNodeData,
  })) as unknown as Node[];
}

describe('AgentNodeInspector', () => {
  const onUpdateNodeData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows placeholder when no node is selected', () => {
    render(<AgentNodeInspector node={null} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    expect(
      screen.getByText('Select a node on the canvas to inspect its properties.'),
    ).toBeInTheDocument();
  });

  it('renders the label input with the node label', () => {
    const node = createMockNode();
    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    expect(screen.getByDisplayValue('My Joiner')).toBeInTheDocument();
  });

  it('calls onUpdateNodeData when label changes', () => {
    const node = createMockNode();
    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);

    const input = screen.getByDisplayValue('My Joiner');
    fireEvent.change(input, { target: { value: 'New Name' } });

    expect(onUpdateNodeData).toHaveBeenCalledWith('test-node-1', { label: 'New Name' });
  });

  it('renders property fields for the node type', () => {
    const node = createMockNode();
    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    expect(screen.getByText('Join String')).toBeInTheDocument();
  });

  it('calls onUpdateNodeData when a text property changes', () => {
    const node = createMockNode();
    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);

    const inputs = screen.getAllByRole('textbox');
    const joinInput = inputs[1];
    fireEvent.change(joinInput, { target: { value: ',' } });

    expect(onUpdateNodeData).toHaveBeenCalledWith('test-node-1', { joinString: ',' });
  });

  it('reflects updated label when the node prop changes', () => {
    const node = createMockNode();
    const { rerender } = render(
      <AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />,
    );
    expect(screen.getByDisplayValue('My Joiner')).toBeInTheDocument();

    const updatedNode = createMockNode({ label: 'Renamed Joiner' });
    rerender(<AgentNodeInspector node={updatedNode} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);

    expect(screen.getByDisplayValue('Renamed Joiner')).toBeInTheDocument();
  });

  it('reflects updated property data when the node prop changes', () => {
    const node = createMockNode();
    const { rerender } = render(
      <AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />,
    );
    expect(screen.getByDisplayValue('My Joiner')).toBeInTheDocument();
    expect(screen.getByText('Join String')).toBeInTheDocument();

    const updatedNode = createMockNode({ joinString: ', ' });
    rerender(
      <AgentNodeInspector node={updatedNode} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />,
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs[1]).toHaveValue(', ');
  });

  it('renders boolean properties as checkboxes', () => {
    const node: Node = {
      id: 'test-node-2',
      type: 'if',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        nodeType: 'if-string-contains',
        label: 'Checker',
        containsString: 'hello',
        caseSensitive: true,
      } as unknown as AgentNodeData,
    } as unknown as Node;

    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onUpdateNodeData when a boolean property toggles', async () => {
    const user = userEvent.setup();
    const node: Node = {
      id: 'test-node-2',
      type: 'if',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        nodeType: 'if-string-contains',
        label: 'Checker',
        containsString: 'hello',
        caseSensitive: true,
      } as unknown as AgentNodeData,
    } as unknown as Node;

    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    await user.click(screen.getByRole('checkbox'));

    expect(onUpdateNodeData).toHaveBeenCalledWith('test-node-2', { caseSensitive: false });
  });

  it('renders number properties', () => {
    const node: Node = {
      id: 'test-node-3',
      type: 'if',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        nodeType: 'if-closest-document',
        label: 'Threshold Node',
        threshold: 0.7,
      } as unknown as AgentNodeData,
    } as unknown as Node;

    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
  });

  it('calls onUpdateNodeData when a number property changes', () => {
    const node: Node = {
      id: 'test-node-3',
      type: 'if',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        nodeType: 'if-closest-document',
        label: 'Threshold Node',
        threshold: 0.7,
      } as unknown as AgentNodeData,
    } as unknown as Node;

    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    const input = screen.getByDisplayValue('0.7');
    fireEvent.change(input, { target: { value: '0.5' } });

    expect(onUpdateNodeData).toHaveBeenCalledWith('test-node-3', { threshold: 0.5 });
  });

  it('renders select properties', () => {
    const node: Node = {
      id: 'test-node-4',
      type: 'process',
      position: { x: 0, y: 0 },
      selected: true,
      data: {
        nodeType: 'rag',
        label: 'RAG Node',
        database: 'default',
        k: 3,
      } as unknown as AgentNodeData,
    } as unknown as Node;

    render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('default');
  });

  it('supports re-render with updated data (simulating parent state update)', () => {
    function TestWrapper() {
      const [node, setNode] = useState<Node | null>(createMockNode());
      return (
        <AgentNodeInspector
          node={node}
          edges={[]}
          nodes={[]}
          onUpdateNodeData={(_id, data) => {
            if (node) {
              setNode({
                ...node,
                data: { ...node.data, ...data } as unknown as Record<string, unknown>,
              } as unknown as Node);
            }
          }}
        />
      );
    }

    render(<TestWrapper />);
    expect(screen.getByDisplayValue('My Joiner')).toBeInTheDocument();
  });

  describe('string-joiner connected inputs', () => {
    it('shows connected input edges with source labels', () => {
      const node = createMockNode();
      const edges = createMockEdges(['src-1', 'src-2']);
      const nodes = createMockNodes({ 'src-1': 'LLM Node', 'src-2': 'RAG Node' });
      render(<AgentNodeInspector node={node} edges={edges} nodes={nodes} onUpdateNodeData={onUpdateNodeData} />);

      expect(screen.getByText('Connected Inputs')).toBeInTheDocument();
      expect(screen.getByText('LLM Node')).toBeInTheDocument();
      expect(screen.getByText('RAG Node')).toBeInTheDocument();
    });

    it('shows muted text when no connected inputs', () => {
      const node = createMockNode();
      render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);

      expect(screen.getByText('No connected inputs')).toBeInTheDocument();
    });

    it('does not show Connected Inputs section for non-string-joiner nodes', () => {
      const node: Node = {
        id: 'test-node-5',
        type: 'process',
        position: { x: 0, y: 0 },
        selected: true,
        data: {
          nodeType: 'llm',
          label: 'LLM',
        } as unknown as AgentNodeData,
      } as unknown as Node;

      render(<AgentNodeInspector node={node} edges={[]} nodes={[]} onUpdateNodeData={onUpdateNodeData} />);
      expect(screen.queryByText('Connected Inputs')).not.toBeInTheDocument();
    });
  });
});
