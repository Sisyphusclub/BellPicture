import { onMounted, onUnmounted, readonly, ref } from 'vue';

const TABLET_MAX_WIDTH = 860;
const MOBILE_MAX_WIDTH = 560;

export function useResponsiveMasonryColumnCount() {
  const columnCount = ref(resolveMasonryColumnCount(readViewportWidth()));

  function syncColumnCount(): void {
    columnCount.value = resolveMasonryColumnCount(readViewportWidth());
  }

  onMounted(() => {
    if (typeof window === 'undefined') return;
    syncColumnCount();
    window.addEventListener('resize', syncColumnCount);
  });

  onUnmounted(() => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', syncColumnCount);
  });

  return {
    columnCount: readonly(columnCount),
  };
}

export function resolveMasonryColumnCount(viewportWidth: number): number {
  if (viewportWidth <= MOBILE_MAX_WIDTH) return 2;
  if (viewportWidth <= TABLET_MAX_WIDTH) return 3;
  return 4;
}

function readViewportWidth(): number {
  if (typeof window === 'undefined') return Number.POSITIVE_INFINITY;
  return window.innerWidth;
}
