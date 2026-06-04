import { useState } from 'react';
import type { ModelInfo, ModelStatus } from '../ai/types';
import { RECOMMENDED_EMBEDDING_MODELS, parseModelId } from '../ai/models';
import './EmbeddingModelSelector.css';

interface EmbeddingModelSelectorProps {
  open: boolean;
  onClose: () => void;
  status: ModelStatus;
  downloadProgress: number;
  loadedModel: ModelInfo | null;
  onSelectModel: (model: ModelInfo) => void;
}

export default function EmbeddingModelSelector({
  open,
  onClose,
  status,
  downloadProgress,
  loadedModel,
  onSelectModel,
}: EmbeddingModelSelectorProps) {
  const [customInput, setCustomInput] = useState('');

  if (!open) return null;

  function handleCustomSubmit() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const parsed = parseModelId(trimmed);
    if (!parsed) return;
    onSelectModel({
      repo: parsed.repo,
      file: parsed.file,
      label: trimmed,
    });
    setCustomInput('');
  }

  function handleRecommendedClick(model: ModelInfo) {
    onSelectModel(model);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  }

  const isDownloading = status === 'downloading';
  const isLoading = status === 'loading';

  return (
    <div className="embd-selector__overlay" onClick={onClose}>
      <div className="embd-selector__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="embd-selector__header">
          <h2 className="embd-selector__title">Embedding Model</h2>
          <button className="embd-selector__close" onClick={onClose} type="button" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="embd-selector__body">
          {loadedModel && (
            <div className="embd-selector__loaded">
              <span className="embd-selector__loaded-label">Active model:</span>
              <span className="embd-selector__loaded-name">{loadedModel.label}</span>
            </div>
          )}

          {(isDownloading || isLoading) && (
            <div className="embd-selector__progress">
              <span className="embd-selector__progress-text">
                {isDownloading ? 'Downloading...' : 'Loading model into memory...'}
              </span>
              {isDownloading && (
                <div className="embd-selector__progress-bar-track">
                  <div
                    className="embd-selector__progress-bar-fill"
                    style={{ width: `${Math.max(downloadProgress, 2)}%` }}
                  />
                </div>
              )}
              {isDownloading && (
                <span className="embd-selector__progress-pct">{downloadProgress}%</span>
              )}
            </div>
          )}

          <label className="embd-selector__custom-label" htmlFor="embd-custom-input">
            Custom model (HuggingFace repo/file)
          </label>
          <div className="embd-selector__custom-row">
            <input
              id="embd-custom-input"
              className="embd-selector__custom-input"
              type="text"
              placeholder="e.g. org/model-file.gguf"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDownloading || isLoading}
            />
            <button
              className="embd-selector__custom-btn"
              onClick={handleCustomSubmit}
              disabled={isDownloading || isLoading || !customInput.trim()}
              type="button"
            >
              Load
            </button>
          </div>

          <div className="embd-selector__recommended-header">
            Recommended embedding models
          </div>

          <div className="embd-selector__recommended-list">
            {RECOMMENDED_EMBEDDING_MODELS.map((model) => (
              <button
                key={`${model.repo}/${model.file}`}
                className="embd-selector__recommended-item"
                onClick={() => handleRecommendedClick(model)}
                disabled={isDownloading || isLoading}
                type="button"
              >
                <div className="embd-selector__recommended-item-info">
                  <span className="embd-selector__recommended-item-label">{model.label}</span>
                  <span className="embd-selector__recommended-item-path">{model.repo}/{model.file}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
