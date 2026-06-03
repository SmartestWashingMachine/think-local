import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import type { RagDocument } from '../types/rag';
import { DUMMY_DOCUMENTS, DUMMY_LINKS } from '../types/rag';
import { useDebounce } from '../hooks/useDebounce';
import './RagView.css';

interface GraphNode extends RagDocument {
  x?: number;
  y?: number;
  z?: number;
}

export default function RagView() {
  const [selectedNode, setSelectedNode] = useState<RagDocument | null>(null);
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

  const highlightedIds = useMemo(() => {
    if (!debouncedSearch) return new Set<string>();
    const q = debouncedSearch.toLowerCase();
    return new Set(
      DUMMY_DOCUMENTS
        .filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
        .map((d) => d.id),
    );
  }, [debouncedSearch]);

  const graphData = useMemo(
    () => ({ nodes: DUMMY_DOCUMENTS as GraphNode[], links: DUMMY_LINKS }),
    [],
  );

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    if (fgRef.current && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      fgRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z + 250 },
        { x: node.x, y: node.y, z: node.z },
        600,
      );
    }
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
      if (highlightedIds.size > 0 && !highlightedIds.has(node.id)) return '#444';
      return '#4fc3f7';
    },
    [selectedNode, highlightedIds],
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
        <div className="rag-view__search">
          <input
            type="text"
            placeholder="Search documents…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="rag-view__details">
          {selectedNode ? (
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
                      <span key={i} className="rag-view__details-chat-tag">{chat}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="rag-view__details-empty">Click a node to view details</p>
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
      </aside>
    </div>
  );
}
