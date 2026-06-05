import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TraceEntry } from '../../types/agentGraph';
import TracePanel from './TracePanel';

function createTraceEntry(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    id: 'trace-1',
    timestamp: Date.now(),
    nodeId: 'node-1',
    nodeLabel: 'LLM',
    nodeType: 'llm',
    type: 'input',
    description: 'LLM Input: Hello world',
    ...overrides,
  };
}

describe('TracePanel', () => {
  it('shows placeholder when no entries', () => {
    render(<TracePanel entries={[]} />);
    expect(
      screen.getByText('No trace data. Run the graph to see execution traces.'),
    ).toBeInTheDocument();
  });

  it('renders trace entries', () => {
    const entries = [
      createTraceEntry({ id: '1', nodeLabel: 'User Query', type: 'output', description: 'User Query: Hello' }),
      createTraceEntry({ id: '2', nodeLabel: 'LLM', type: 'input', description: 'LLM Input: Hello' }),
      createTraceEntry({ id: '3', nodeLabel: 'LLM', type: 'output', description: 'LLM Output: Hi there' }),
    ];
    render(<TracePanel entries={entries} />);
    expect(screen.getByText('User Query')).toBeInTheDocument();
    expect(screen.getAllByText('LLM')).toHaveLength(2);
    expect(screen.getByText('User Query: Hello')).toBeInTheDocument();
    expect(screen.getByText('LLM Input: Hello')).toBeInTheDocument();
    expect(screen.getByText('LLM Output: Hi there')).toBeInTheDocument();
  });

  it('shows step count', () => {
    const entries = [
      createTraceEntry({ id: '1' }),
      createTraceEntry({ id: '2' }),
      createTraceEntry({ id: '3' }),
    ];
    render(<TracePanel entries={entries} />);
    expect(screen.getByText('3 steps')).toBeInTheDocument();
  });

  it('shows singular step count for one entry', () => {
    const entries = [createTraceEntry({ id: '1' })];
    render(<TracePanel entries={entries} />);
    expect(screen.getByText('1 step')).toBeInTheDocument();
  });

  it('renders entries in chronological order (top to bottom)', () => {
    const entries = [
      createTraceEntry({ id: '1', timestamp: 1000, description: 'First' }),
      createTraceEntry({ id: '2', timestamp: 2000, description: 'Second' }),
      createTraceEntry({ id: '3', timestamp: 3000, description: 'Third' }),
    ];
    render(<TracePanel entries={entries} />);

    const descriptions = screen.getAllByText(/First|Second|Third/);
    expect(descriptions[0]).toHaveTextContent('First');
    expect(descriptions[1]).toHaveTextContent('Second');
    expect(descriptions[2]).toHaveTextContent('Third');
  });

  it('shows IN tag for input entries and OUT tag for output entries', () => {
    const entries = [
      createTraceEntry({ id: '1', type: 'input' }),
      createTraceEntry({ id: '2', type: 'output' }),
    ];
    render(<TracePanel entries={entries} />);
    expect(screen.getByText('IN')).toBeInTheDocument();
    expect(screen.getByText('OUT')).toBeInTheDocument();
  });
});
