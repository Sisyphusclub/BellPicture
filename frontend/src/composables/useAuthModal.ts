import { ref } from 'vue';

const isOpen = ref(false);

export function useAuthModal() {
  function open(): void {
    isOpen.value = true;
  }
  function close(): void {
    isOpen.value = false;
  }
  return { isOpen, open, close };
}
