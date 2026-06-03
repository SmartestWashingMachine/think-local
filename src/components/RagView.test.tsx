import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RagView from './RagView';

vi.mock('react-force-graph-3d', () => ({
  default: () => <div data-testid="force-graph">Mock ForceGraph3D</div>,
}));

describe('RagView', () => {
  it('renders the graph container', () => {
    render(<RagView />);
    expect(screen.getByTestId('force-graph')).toBeInTheDocument();
  });

  it('renders zoom control buttons', () => {
    render(<RagView />);
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Reset view')).toBeInTheDocument();
  });

  it('renders the info pane with empty state', () => {
    render(<RagView />);
    expect(screen.getByText('Click a node to view details')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<RagView />);
    expect(screen.getByPlaceholderText('Search documents…')).toBeInTheDocument();
  });

  it('renders the stub embedding query input', () => {
    render(<RagView />);
    expect(
      screen.getByPlaceholderText('Query embeddings (stub)…'),
    ).toBeInTheDocument();
  });

  it('updates search when typing in search input', async () => {
    const user = userEvent.setup();
    render(<RagView />);

    const searchInput = screen.getByPlaceholderText('Search documents…');
    await user.type(searchInput, 'quantum');

    expect(searchInput).toHaveValue('quantum');
  });

  it('triggers stub query on Enter in the bottom input', async () => {
    const user = userEvent.setup();
    render(<RagView />);

    const stubInput = screen.getByPlaceholderText('Query embeddings (stub)…');
    await user.type(stubInput, 'test query');
    await user.keyboard('{Enter}');

    // The stub should set the search query, so check search input
    expect(screen.getByPlaceholderText('Search documents…')).toHaveValue('test query');
  });
});
