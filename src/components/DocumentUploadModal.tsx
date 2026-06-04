import { useRef, useState } from 'react';
import type { ModelStatus } from '../ai/types';
import './DocumentUploadModal.css';

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  embeddingStatus: ModelStatus;
  embeddingDownloadProgress: number;
  embeddingModelLabel: string | null;
  onLoadDefaultModel: () => void;
  onOpenModelSelector: () => void;
  onEmbedDocuments: (
    files: File[],
    onProgress: (current: number, total: number) => void,
  ) => Promise<void>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploadModal({
  open,
  onClose,
  embeddingStatus,
  embeddingDownloadProgress,
  embeddingModelLabel,
  onLoadDefaultModel,
  onOpenModelSelector,
  onEmbedDocuments,
}: DocumentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const modelReady = embeddingStatus === 'loaded';
  const modelIdle = embeddingStatus === 'idle';
  const modelBusy = embeddingStatus === 'downloading' || embeddingStatus === 'loading';
  const modelError = embeddingStatus === 'error';

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
    e.target.value = '';
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    if (selectedFiles.length === 0 || !modelReady) return;
    setProcessing(true);
    setError(null);
    try {
      await onEmbedDocuments(selectedFiles, (current, total) => {
        setProcessingProgress({ current, total });
      });
      setSelectedFiles([]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process documents');
    } finally {
      setProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  }

  const confirmDisabled = selectedFiles.length === 0 || !modelReady || processing;

  return (
    <div className="doc-upload__overlay" onClick={onClose}>
      <div className="doc-upload__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="doc-upload__header">
          <h2 className="doc-upload__title">Add documents</h2>
          <button className="doc-upload__close" onClick={onClose} type="button" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="doc-upload__body">
          {modelBusy && (
            <div className="doc-upload__model-status">
              <span className="doc-upload__model-status-text">
                Loading embedding model{embeddingModelLabel ? ` (${embeddingModelLabel})` : ''}…
              </span>
              {embeddingStatus === 'downloading' && (
                <div className="doc-upload__progress-bar-track">
                  <div
                    className="doc-upload__progress-bar-fill"
                    style={{ width: `${Math.max(embeddingDownloadProgress, 2)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {modelError && (
            <div className="doc-upload__model-status doc-upload__model-status--error">
              <span>Failed to load embedding model.</span>
              <button className="doc-upload__model-retry" onClick={onLoadDefaultModel} type="button">Retry</button>
            </div>
          )}

          {modelIdle && (
            <div className="doc-upload__model-status">
              <span>No embedding model loaded.</span>
              <div className="doc-upload__model-actions">
                <button className="doc-upload__model-btn" onClick={onLoadDefaultModel} type="button">
                  Load default model
                </button>
                <button className="doc-upload__model-btn doc-upload__model-btn--secondary" onClick={() => { onClose(); onOpenModelSelector(); }} type="button">
                  Choose model…
                </button>
              </div>
            </div>
          )}

          <div className="doc-upload__file-area">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.csv,.html,.js,.ts,.tsx,.jsx,.py,.css,.yml,.yaml,.xml"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="doc-upload__browse-btn"
              onClick={handleBrowseClick}
              disabled={processing || modelBusy}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Browse files
            </button>
            <p className="doc-upload__file-hint">Supported: .txt, .md, .json, .csv, source files</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="doc-upload__file-list">
              <span className="doc-upload__file-list-header">{selectedFiles.length} file(s) selected</span>
              {selectedFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="doc-upload__file-item">
                  <span className="doc-upload__file-item-name">{file.name}</span>
                  <span className="doc-upload__file-item-size">{formatFileSize(file.size)}</span>
                  {!processing && (
                    <button
                      className="doc-upload__file-item-remove"
                      onClick={() => handleRemoveFile(i)}
                      type="button"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {processing && (
            <div className="doc-upload__processing">
              <span>Processing document {processingProgress.current} of {processingProgress.total}…</span>
              <div className="doc-upload__progress-bar-track">
                <div
                  className="doc-upload__progress-bar-fill"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="doc-upload__error">{error}</div>
          )}
        </div>

        <div className="doc-upload__footer">
          <button className="doc-upload__cancel-btn" onClick={onClose} disabled={processing} type="button">
            Cancel
          </button>
          <button
            className="doc-upload__confirm-btn"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            type="button"
          >
            {processing ? 'Embedding…' : `Embed & Store${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
