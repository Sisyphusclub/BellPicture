export interface ExternalStore<T> {
  getSnapshot: () => T;
  set: (next: T | ((current: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createExternalStore<T>(initialValue: T): ExternalStore<T> {
  let value = initialValue;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (current: T) => T)(value) : next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
