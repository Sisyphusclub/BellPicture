import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

Object.defineProperty(globalThis, 'Blob', {
  configurable: true,
  value: NodeBlob,
});

Object.defineProperty(globalThis, 'File', {
  configurable: true,
  value: NodeFile,
});

let objectUrlCount = 0;

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => {
    objectUrlCount += 1;
    return `blob:nebulens-test-${objectUrlCount}`;
  }),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });

Object.defineProperty(globalThis, 'IntersectionObserver', {
  configurable: true,
  value: class IntersectionObserverStub {
    disconnect(): void {}
    observe(): void {}
    unobserve(): void {}
  },
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
