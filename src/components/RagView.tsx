import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import type { RagDocument, StoredDocument } from '../types/rag';
import { useDebounce } from '../hooks/useDebounce';
import './RagView.css';

interface GraphNode extends RagDocument {
  x?: number;
  y?: number;
  z?: number;
}

interface RagViewProps {
  documents: StoredDocument[];
  embeddingModelStatus: string;
  onOpenEmbeddingModelSelector: () => void;
  onOpenAddDocuments: () => void;
}

export default function RagView({
  documents,
  embeddingModelStatus,
  onOpenEmbeddingModelSelector,
  onOpenAddDocuments,
}: RagViewProps) {
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, unknown>>(undefined as unknown as ForceGraphMethods<GraphNode, unknown>);
  const cameraDistRef = useRef(300);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setGraphSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const filteredDocs = useMemo(() => {
    if (!debouncedSearch) return documents;
    const q = debouncedSearch.toLowerCase();
    return documents.filter(
      (d) => d.filename.toLowerCase().includes(q) || d.content.toLowerCase().includes(q),
    );
  }, [documents, debouncedSearch]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = documents.map((d) => ({
      id: d.id,
      title: d.filename,
      content: d.content,
      dateAdded: d.dateAdded,
      queryCount: 0,
      relatedChats: [],
    }));
    return { nodes, links: [] };
  }, [documents]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    const doc = documents.find((d) => d.id === node.id) ?? null;
    setSelectedDoc(doc);
    if (fgRef.current && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      fgRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z + 250 },
        { x: node.x, y: node.y, z: node.z },
        600,
      );
    }
  }, [documents]);

  const handleDocClick = useCallback((doc: StoredDocument) => {
    setSelectedDoc(doc);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!fgRef.current) return;
    cameraDistRef.current = Math.max(30, cameraDistRef.current * 0.7);
    fgRef.current.cameraPosition({ z: cameraDistRef.current }, undefined, 300);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!fgRef.current) return;
    cameraDistRef.current = Math.min(2000, cameraDistRef.current * 1.3);
    fgRef.current.cameraPosition({ z: cameraDistRef.current }, undefined, 300);
  }, []);

  const handleResetView = useCallback(() => {
    if (!fgRef.current) return;
    cameraDistRef.current = 300;
    fgRef.current.zoomToFit(400, 50);
  }, []);

  const nodeColor = useCallback(
    (node: GraphNode) => {
      if (selectedDoc && node.id === selectedDoc.id) return '#ff6b6b';
      return '#4fc3f7';
    },
    [selectedDoc],
  );

  const nodeLabel = useCallback((node: GraphNode) => {
    const text = node.title;
    return text.length > 50 ? text.slice(0, 50) + '…' : text;
  }, []);

  const handleStubQuery = useCallback((text: string) => {
    if (!text.trim()) return;
    setSearchQuery(text);
  }, []);

  return (
    <div className="rag-view">
      <div className="rag-view__graph" ref={containerRef}>
        {graphSize.width > 0 && graphData.nodes.length > 0 && (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={graphSize.width}
            height={graphSize.height}
            nodeLabel={nodeLabel}
            nodeColor={nodeColor}
            linkColor={() => '#666'}
            linkWidth={0.5}
            onNodeClick={handleNodeClick}
            backgroundColor="#111"
          />
        )}
        <div className="rag-view__zoom">
          <button className="rag-view__zoom-btn" onClick={handleZoomIn} type="button" title="Zoom in">
            +
          </button>
          <button className="rag-view__zoom-btn" onClick={handleZoomOut} type="button" title="Zoom out">
            −
          </button>
          <button className="rag-view__zoom-btn" onClick={handleResetView} type="button" title="Reset view">
            ⟲
          </button>
        </div>
      </div>

      <aside className="rag-view__info">
        <div className="rag-view__info-content">
          {documents.length > 0 ? (
            <>
              <div className="rag-view__search">
                <input
                  type="text"
                  placeholder="Search documents…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="rag-view__details">
                {selectedDoc ? (
                  <>
                    <h3 className="rag-view__details-title">{selectedDoc.filename}</h3>
                    <div className="rag-view__details-meta">
                      <span>Added: {new Date(selectedDoc.dateAdded).toLocaleDateString()}</span>
                    </div>
                    <div className="rag-view__details-content">
                      <p>{selectedDoc.content}</p>
                    </div>
                  </>
                ) : (
                  <p className="rag-view__details-empty">Select a document to view details</p>
                )}

                {filteredDocs.length > 0 && (
                  <div className="rag-view__doc-list">
                    <strong className="rag-view__doc-list-header">Documents ({filteredDocs.length})</strong>
                    {filteredDocs.map((doc) => (
                      <button
                        key={doc.id}
                        className={`rag-view__doc-item ${selectedDoc?.id === doc.id ? 'rag-view__doc-item--active' : ''}`}
                        onClick={() => handleDocClick(doc)}
                        type="button"
                      >
                        <span className="rag-view__doc-item-name">{doc.filename}</span>
                        <span className="rag-view__doc-item-date">{new Date(doc.dateAdded).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rag-view__input">
                <input
                  type="text"
                  placeholder="Query embeddings (stub)…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleStubQuery((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="rag-view__empty">
              <p className="rag-view__details-empty">No documents yet.</p>
            </div>
          )}
        </div>

        <div className="rag-view__actions">
          <button className="rag-view__embd-btn" onClick={onOpenEmbeddingModelSelector} type="button" title="Embedding model">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Embedding Model</span>
            {embeddingModelStatus === 'loaded' && <span className="rag-view__model-dot rag-view__model-dot--loaded" />}
            {(embeddingModelStatus === 'downloading' || embeddingModelStatus === 'loading') && (
              <span className="rag-view__model-dot rag-view__model-dot--busy" />
            )}
          </button>
          <button className="rag-view__add-docs-btn" onClick={onOpenAddDocuments} type="button" title="Add documents">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Add documents
          </button>
        </div>
      </aside>
    </div>
  );
}
