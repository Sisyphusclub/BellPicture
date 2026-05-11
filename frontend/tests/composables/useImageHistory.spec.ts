import { beforeEach, describe, expect, it } from 'vitest';

import { useImageHistory, resetImageHistoryForTests } from '@/composables/useImageHistory';
import { clearBlobs, resetImageDbConnectionForTests } from '@/services/storage/indexedDb';
import * as metaStore from '@/services/storage/localStorageMeta';
import type { ImageRecord } from '@/types/image';

describe('useImageHistory', () => {
  beforeEach(async () => {
    resetImageHistoryForTests();
    resetImageDbConnectionForTests();
    await clearBlobs();
    metaStore.clear();
  });

  it('adds metadata and blob entries to shared history state', async () => {
    const { add, entries } = useImageHistory();
    const record: ImageRecord = {
      id: 'generated.png',
      createdAt: '2026-05-11T00:00:00.000Z',
      prompt: 'dark navy product surface',
      model: 'gpt-image-2',
      width: 1024,
      height: 1024,
    };

    await add(record, new Blob(['pixels'], { type: 'image/png' }));

    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]?.record.prompt).toBe('dark navy product surface');
    expect(metaStore.listAll()).toHaveLength(1);
  });
});
