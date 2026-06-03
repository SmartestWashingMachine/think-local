import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia (not implemented in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock Element.prototype.scrollIntoView (not implemented in jsdom)
Element.prototype.scrollIntoView = () => {};

// Mock ResizeObserver (not implemented in jsdom)
class ResizeObserverMock {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Trigger callback with default size so ForceGraph3D renders
    this.callback(
      [{ contentRect: { width: 800, height: 600 } as DOMRectReadOnly, target } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
