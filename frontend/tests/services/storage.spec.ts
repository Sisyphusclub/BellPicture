import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearBlobs,
  getBlob,
  putBlob,
  resetImageDbConnectionForTests,
} from '@/services/storage/indexedDb';
import * as metaStore from '@/services/storage/localStorageMeta';
import type { ImageRecord } from '@/types/image';

describe('storage services', () => {
  beforeEach(async () => {
    resetImageDbConnectionForTests();
    await clearBlobs();
    metaStore.clear();
  });

  it('stores image blobs in IndexedDB by id', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });

    await putBlob('one.png', blob);

    const stored = await getBlob('one.png');
    expect(stored).toBeInstanceOf(Blob);
    expect(stored?.type).toBe('image/png');
  });

  it('stores schema-versioned metadata in localStorage', () => {
    const record: ImageRecord = {
      id: 'one.png',
      createdAt: '2026-05-11T00:00:00.000Z',
      prompt: 'cream canvas',
      model: 'gpt-image-2',
      width: 512,
      height: 512,
    };

    metaStore.put(record);

    expect(metaStore.listAll()).toEqual([record]);
  });
});
