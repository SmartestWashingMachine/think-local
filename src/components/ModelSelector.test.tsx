import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ModelSelector from './ModelSelector';
import { RECOMMENDED_MODELS } from '../ai/models';

describe('ModelSelector', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    status: 'idle' as const,
    downloadProgress: 0,
    loadedModel: null,
    cachedModels: [] as { url: string; size: number }[],
    onSelectModel: vi.fn(),
  };

  it('renders nothing when closed', () => {
    const { container } = render(
      <ModelSelector {...defaultProps} open={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the dialog when open', () => {
    render(<ModelSelector {...defaultProps} />);
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Recommended models')).toBeInTheDocument();
  });

  it('renders recommended model items', () => {
    render(<ModelSelector {...defaultProps} />);
    for (const model of RECOMMENDED_MODELS) {
      expect(screen.getByText(model.label)).toBeInTheDocument();
    }
  });

  it('shows the custom model input field', () => {
    render(<ModelSelector {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('e.g. org/model-file.gguf'),
    ).toBeInTheDocument();
  });

  it('calls onSelectModel with parsed model ID when custom input is submitted', async () => {
    const onSelectModel = vi.fn();
    const user = userEvent.setup();

    render(
      <ModelSelector {...defaultProps} onSelectModel={onSelectModel} />,
    );

    const input = screen.getByPlaceholderText('e.g. org/model-file.gguf');
    await user.type(input, 'org/my-model.gguf');
    await user.click(screen.getByText('Load'));

    expect(onSelectModel).toHaveBeenCalledWith({
      repo: 'org',
      file: 'my-model.gguf',
      label: 'org/my-model.gguf',
    });
  });

  it('calls onSelectModel when a recommended model is clicked', async () => {
    const onSelectModel = vi.fn();
    const user = userEvent.setup();

    render(
      <ModelSelector {...defaultProps} onSelectModel={onSelectModel} />,
    );

    const firstModel = RECOMMENDED_MODELS[0];
    await user.click(screen.getByText(firstModel.label));

    expect(onSelectModel).toHaveBeenCalledWith(firstModel);
  });

  it('shows the active model when one is loaded', () => {
    render(
      <ModelSelector
        {...defaultProps}
        loadedModel={{
          repo: 'test-org',
          file: 'test-model.gguf',
          label: 'Test Model',
        }}
      />,
    );

    expect(screen.getByText('Active model:')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });

  it('shows download progress bar when downloading', () => {
    render(
      <ModelSelector
        {...defaultProps}
        status="downloading"
        downloadProgress={42}
      />,
    );

    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows loading text when loading model into memory', () => {
    render(<ModelSelector {...defaultProps} status="loading" />);

    expect(
      screen.getByText('Loading model into memory...'),
    ).toBeInTheDocument();
  });

  it('closes the dialog when clicking the overlay', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <ModelSelector {...defaultProps} onClose={onClose} />,
    );

    const overlay = container.querySelector('.model-selector__overlay')!;
    await user.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the dialog when clicking the X button', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ModelSelector {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
