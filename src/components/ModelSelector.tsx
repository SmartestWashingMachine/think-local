import { useState } from 'react';
import type { ModelInfo, ModelStatus } from '../ai/types';
import { RECOMMENDED_MODELS, parseModelId } from '../ai/models';
import './ModelSelector.css';

interface ModelSelectorProps {
  open: boolean;
  onClose: () => void;
  status: ModelStatus;
  downloadProgress: number;
  loadedModel: ModelInfo | null;
  cachedModels: { url: string; size: number }[];
  onSelectModel: (model: ModelInfo) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ModelSelector({
  open,
  onClose,
  status,
  downloadProgress,
  loadedModel,
  cachedModels,
  onSelectModel,
}: ModelSelectorProps) {
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

  function cachedUrlFor(info: ModelInfo): string {
    return `https://huggingface.co/${info.repo}/resolve/main/${info.file}`;
  }

  function isCached(info: ModelInfo): boolean {
    const url = cachedUrlFor(info);
    return cachedModels.some((m) => m.url === url);
  }

  function getCachedSize(info: ModelInfo): string {
    const url = cachedUrlFor(info);
    const found = cachedModels.find((m) => m.url === url);
    return found ? formatBytes(found.size) : '';
  }

  return (
    <div className="model-selector__overlay" onClick={onClose}>
      <div className="model-selector__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="model-selector__header">
          <h2 className="model-selector__title">Models</h2>
          <button className="model-selector__close" onClick={onClose} type="button" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="model-selector__body">
          {loadedModel && (
            <div className="model-selector__loaded">
              <span className="model-selector__loaded-label">Active model:</span>
              <span className="model-selector__loaded-name">{loadedModel.label}</span>
            </div>
          )}

          {(isDownloading || isLoading) && (
            <div className="model-selector__progress">
              <span className="model-selector__progress-text">
                {isDownloading ? 'Downloading...' : 'Loading model into memory...'}
              </span>
              {isDownloading && (
                <div className="model-selector__progress-bar-track">
                  <div
                    className="model-selector__progress-bar-fill"
                    style={{ width: `${Math.max(downloadProgress, 2)}%` }}
                  />
                </div>
              )}
              {isDownloading && (
                <span className="model-selector__progress-pct">{downloadProgress}%</span>
              )}
            </div>
          )}

          <label className="model-selector__custom-label" htmlFor="model-custom-input">
            Custom model (HuggingFace repo/file)
          </label>
          <div className="model-selector__custom-row">
            <input
              id="model-custom-input"
              className="model-selector__custom-input"
              type="text"
              placeholder="e.g. org/model-file.gguf"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDownloading || isLoading}
            />
            <button
              className="model-selector__custom-btn"
              onClick={handleCustomSubmit}
              disabled={isDownloading || isLoading || !customInput.trim()}
              type="button"
            >
              Load
            </button>
          </div>

          <div className="model-selector__recommended-header">
            Recommended models
          </div>

          <div className="model-selector__recommended-list">
            {RECOMMENDED_MODELS.map((model) => (
              <button
                key={`${model.repo}/${model.file}`}
                className="model-selector__recommended-item"
                onClick={() => handleRecommendedClick(model)}
                disabled={isDownloading || isLoading}
                type="button"
              >
                <div className="model-selector__recommended-item-info">
                  <span className="model-selector__recommended-item-label">{model.label}</span>
                  <span className="model-selector__recommended-item-path">{model.repo}/{model.file}</span>
                </div>
                {isCached(model) && (
                  <span className="model-selector__recommended-item-cached">
                    Cached ({getCachedSize(model)})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
