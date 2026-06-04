import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RagView from './RagView';

vi.mock('react-force-graph-3d', () => ({
  default: () => <div data-testid="force-graph">Mock ForceGraph3D</div>,
}));

const mockDocs = [
  { id: '1', filename: 'doc1.txt', content: 'quantum computing', dateAdded: Date.now() },
  { id: '2', filename: 'doc2.md', content: 'machine learning', dateAdded: Date.now() - 1000 },
];

describe('RagView', () => {
  it('renders the graph container', () => {
    render(<RagView documents={mockDocs} />);
    expect(screen.getByTestId('force-graph')).toBeInTheDocument();
  });

  it('renders zoom control buttons', () => {
    render(<RagView documents={mockDocs} />);
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Reset view')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<RagView documents={[]} />);
    expect(screen.getByText('No documents yet.')).toBeInTheDocument();
    expect(screen.getByText('Add documents using the sidebar button.')).toBeInTheDocument();
  });

  it('renders the search input when documents exist', () => {
    render(<RagView documents={mockDocs} />);
    expect(screen.getByPlaceholderText('Search documents…')).toBeInTheDocument();
  });

  it('renders document list when documents exist', () => {
    render(<RagView documents={mockDocs} />);
    expect(screen.getByText('doc1.txt')).toBeInTheDocument();
    expect(screen.getByText('doc2.md')).toBeInTheDocument();
  });

  it('renders the stub embedding query input', () => {
    render(<RagView documents={mockDocs} />);
    expect(
      screen.getByPlaceholderText('Query embeddings (stub)…'),
    ).toBeInTheDocument();
  });

  it('selects a document when clicked', async () => {
    const user = userEvent.setup();
    render(<RagView documents={mockDocs} />);

    await user.click(screen.getByText('doc1.txt'));
    expect(screen.getByText('quantum computing')).toBeInTheDocument();
  });

  it('updates search when typing in search input', async () => {
    const user = userEvent.setup();
    render(<RagView documents={mockDocs} />);

    const searchInput = screen.getByPlaceholderText('Search documents…');
    await user.type(searchInput, 'quantum');

    expect(searchInput).toHaveValue('quantum');
  });

  it('triggers stub query on Enter in the bottom input', async () => {
    const user = userEvent.setup();
    render(<RagView documents={mockDocs} />);

    const stubInput = screen.getByPlaceholderText('Query embeddings (stub)…');
    await user.type(stubInput, 'test query');
    await user.keyboard('{Enter}');

    expect(screen.getByPlaceholderText('Search documents…')).toHaveValue('test query');
  });
});
