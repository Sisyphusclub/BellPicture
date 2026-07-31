import { useCallback, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';

const store = createExternalStore<ReadonlySet<symbol>>(new Set());

export function useImageDetailModalState() {
  const ids = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const openImageDetailModal = useCallback((id: symbol) => {
    store.set((current) => new Set(current).add(id));
  }, []);
  const closeImageDetailModal = useCallback((id: symbol) => {
    store.set((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);
  return { isImageDetailModalOpen: ids.size > 0, openImageDetailModal, closeImageDetailModal };
}
