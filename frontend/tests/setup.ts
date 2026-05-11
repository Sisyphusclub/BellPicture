import 'fake-indexeddb/auto';

import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';

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
    return `blob:ref2image-test-${objectUrlCount}`;
  }),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: vi.fn(),
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
