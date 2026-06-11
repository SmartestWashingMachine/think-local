import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

describe('Landing', () => {
  it('renders the title and subtitle', () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText('Think Local')).toBeInTheDocument();
    expect(
      screen.getByText(/A private sanctuary for conversation/),
    ).toBeInTheDocument();
  });

  it('renders a "Begin your private conversation" button', () => {
    render(<Landing onStart={() => {}} />);
    expect(
      screen.getByRole('button', { name: /Begin your private conversation/ }),
    ).toBeInTheDocument();
  });

  it('calls onStart when the button is clicked', async () => {
    const onStart = vi.fn();
    render(<Landing onStart={onStart} />);
    const button = screen.getByRole('button', {
      name: /Begin your private conversation/,
    });
    await userEvent.click(button);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
