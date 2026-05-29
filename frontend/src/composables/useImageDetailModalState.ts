import { computed, ref } from 'vue';

const openImageDetailModalIds = ref<ReadonlySet<symbol>>(new Set());
const isImageDetailModalOpen = computed(() => openImageDetailModalIds.value.size > 0);

export function useImageDetailModalState() {
  function openImageDetailModal(id: symbol): void {
    const nextIds = new Set(openImageDetailModalIds.value);
    nextIds.add(id);
    openImageDetailModalIds.value = nextIds;
  }

  function closeImageDetailModal(id: symbol): void {
    if (!openImageDetailModalIds.value.has(id)) return;
    const nextIds = new Set(openImageDetailModalIds.value);
    nextIds.delete(id);
    openImageDetailModalIds.value = nextIds;
  }

  return {
    isImageDetailModalOpen,
    openImageDetailModal,
    closeImageDetailModal,
  };
}
