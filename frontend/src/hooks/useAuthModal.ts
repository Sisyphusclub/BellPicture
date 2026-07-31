import { useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';

interface AuthModalState {
  isOpen: boolean;
  returnFocus: HTMLElement | null;
  onSuccess: (() => void | Promise<void>) | null;
}

interface OpenAuthModalOptions {
  onSuccess?: () => void | Promise<void>;
  trigger?: HTMLElement | null;
}

const store = createExternalStore<AuthModalState>({
  isOpen: false,
  returnFocus: null,
  onSuccess: null,
});

function activeElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function restoreFocus(target: HTMLElement | null): void {
  if (!target) return;
  window.requestAnimationFrame(() => target.focus());
}

export function openAuthModal(options: OpenAuthModalOptions = {}): void {
  store.set({
    isOpen: true,
    returnFocus: options.trigger ?? activeElement(),
    onSuccess: options.onSuccess ?? null,
  });
}

export function closeAuthModal(): void {
  const current = store.getSnapshot();
  store.set({ isOpen: false, returnFocus: null, onSuccess: null });
  restoreFocus(current.returnFocus);
}

export async function completeAuthModal(): Promise<void> {
  const current = store.getSnapshot();
  store.set({ isOpen: false, returnFocus: null, onSuccess: null });
  restoreFocus(current.returnFocus);
  await current.onSuccess?.();
}

export function useAuthModal() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    ...state,
    open: openAuthModal,
    close: closeAuthModal,
    complete: completeAuthModal,
  };
}
