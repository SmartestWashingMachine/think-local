import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import type { RagDocument, StoredDocument } from '../types/rag';
import { DUMMY_DOCUMENTS, DUMMY_LINKS } from '../types/rag';
import { useDebounce } from '../hooks/useDebounce';
import './RagView.css';

interface GraphNode extends RagDocument {
  x?: number;
  y?: number;
  z?: number;
}

interface RagViewProps {
  documents: StoredDocument[];
}

export default function RagView({ documents }: RagViewProps) {
  const [selectedNode, setSelectedNode] = useState<RagDocument | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, unknown>>(undefined as unknown as ForceGraphMethods<GraphNode, unknown>);
  const cameraDistRef = useRef(300);
  const prevHighlightedRef = useRef(false);

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

  const dummyHighlightedIds = useMemo(() => {
    if (!debouncedSearch) return new Set<string>();
    const q = debouncedSearch.toLowerCase();
    return new Set(
      DUMMY_DOCUMENTS
        .filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
        .map((d) => d.id),
    );
  }, [debouncedSearch]);

  useEffect(() => {
    if (!fgRef.current) return;
    const hasResults = dummyHighlightedIds.size > 0;
    if (hasResults && !prevHighlightedRef.current) {
      fgRef.current.zoomToFit(400, 80, (node) => dummyHighlightedIds.has(node.id as string));
    }
    prevHighlightedRef.current = hasResults;
  }, [dummyHighlightedIds]);

  const graphData = useMemo(
    () => ({ nodes: DUMMY_DOCUMENTS as GraphNode[], links: DUMMY_LINKS }),
    [],
  );

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setSelectedDoc(null);
    if (fgRef.current && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      fgRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z + 250 },
        { x: node.x, y: node.y, z: node.z },
        600,
      );
    }
  }, []);

  const handleDocClick = useCallback((doc: StoredDocument) => {
    setSelectedDoc(doc);
    setSelectedNode(null);
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
      if (selectedNode && node.id === selectedNode.id) return '#ff6b6b';
      if (dummyHighlightedIds.size > 0 && !dummyHighlightedIds.has(node.id)) return '#444';
      return '#4fc3f7';
    },
    [selectedNode, dummyHighlightedIds],
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
        {graphSize.width > 0 && (
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
              ) : selectedNode ? (
                <>
                  <h3 className="rag-view__details-title">{selectedNode.title}</h3>
                  <div className="rag-view__details-meta">
                    <span>Added: {new Date(selectedNode.dateAdded).toLocaleDateString()}</span>
                    <span>Queried: {selectedNode.queryCount} times</span>
                  </div>
                  <div className="rag-view__details-content">
                    <p>{selectedNode.content}</p>
                  </div>
                  {selectedNode.relatedChats.length > 0 && (
                    <div className="rag-view__details-chats">
                      <strong>Related chats</strong>
                      <div className="rag-view__details-chats-tags">
                        {selectedNode.relatedChats.map((chat, i) => (
                          <button key={i} className="rag-view__details-chat-tag" onClick={() => setSearchQuery(chat)} type="button">{chat}</button>
                        ))}
                      </div>
                    </div>
                  )}
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
            <p className="rag-view__details-empty">Add documents using the sidebar button.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
