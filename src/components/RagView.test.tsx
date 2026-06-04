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

const defaultProps = {
  documents: mockDocs,
  embeddingModelStatus: 'idle',
  onOpenEmbeddingModelSelector: vi.fn(),
  onOpenAddDocuments: vi.fn(),
};

describe('RagView', () => {
  it('renders the graph container', () => {
    render(<RagView {...defaultProps} />);
    expect(screen.getByTestId('force-graph')).toBeInTheDocument();
  });

  it('renders zoom control buttons', () => {
    render(<RagView {...defaultProps} />);
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Reset view')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<RagView {...defaultProps} documents={[]} />);
    expect(screen.getByText('No documents yet.')).toBeInTheDocument();
  });

  it('renders the search input when documents exist', () => {
    render(<RagView {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search documents…')).toBeInTheDocument();
  });

  it('renders document list when documents exist', () => {
    render(<RagView {...defaultProps} />);
    expect(screen.getByText('doc1.txt')).toBeInTheDocument();
    expect(screen.getByText('doc2.md')).toBeInTheDocument();
  });

  it('renders the stub embedding query input', () => {
    render(<RagView {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Query embeddings (stub)…'),
    ).toBeInTheDocument();
  });

  it('selects a document when clicked', async () => {
    const user = userEvent.setup();
    render(<RagView {...defaultProps} />);

    await user.click(screen.getByText('doc1.txt'));
    expect(screen.getByText('quantum computing')).toBeInTheDocument();
  });

  it('updates search when typing in search input', async () => {
    const user = userEvent.setup();
    render(<RagView {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search documents…');
    await user.type(searchInput, 'quantum');

    expect(searchInput).toHaveValue('quantum');
  });

  it('triggers stub query on Enter in the bottom input', async () => {
    const user = userEvent.setup();
    render(<RagView {...defaultProps} />);

    const stubInput = screen.getByPlaceholderText('Query embeddings (stub)…');
    await user.type(stubInput, 'test query');
    await user.keyboard('{Enter}');

    expect(screen.getByPlaceholderText('Search documents…')).toHaveValue('test query');
  });

  it('renders Embedding Model and Add documents buttons', () => {
    render(<RagView {...defaultProps} />);
    expect(screen.getByText('Embedding Model')).toBeInTheDocument();
    expect(screen.getByText('Add documents')).toBeInTheDocument();
  });

  it('calls onOpenEmbeddingModelSelector when Embedding Model button is clicked', async () => {
    const onOpenEmbeddingModelSelector = vi.fn();
    const user = userEvent.setup();
    render(
      <RagView
        {...defaultProps}
        onOpenEmbeddingModelSelector={onOpenEmbeddingModelSelector}
      />,
    );
    await user.click(screen.getByText('Embedding Model'));
    expect(onOpenEmbeddingModelSelector).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenAddDocuments when Add documents button is clicked', async () => {
    const onOpenAddDocuments = vi.fn();
    const user = userEvent.setup();
    render(
      <RagView
        {...defaultProps}
        onOpenAddDocuments={onOpenAddDocuments}
      />,
    );
    await user.click(screen.getByText('Add documents'));
    expect(onOpenAddDocuments).toHaveBeenCalledTimes(1);
  });
});
