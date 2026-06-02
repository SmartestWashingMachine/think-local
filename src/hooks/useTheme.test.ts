import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';
import { STORAGE_KEYS } from '../constants/chat';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  it('returns "light" as the default theme when no preference is stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('reads the stored theme from localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggles the theme from light to dark', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe('dark');
  });

  it('toggles the theme from dark to light', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe('light');
  });

  it('persists the theme to localStorage after toggling', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });

  it('sets data-theme attribute on documentElement', () => {
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
