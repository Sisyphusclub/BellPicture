import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

interface ToastContextValue {
  notify: (message: string, tone?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => undefined });

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: string } | null>(null);
  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, message, tone });
    window.setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 3200);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast ? <p className={`toast toast--${toast.tone}`}>{toast.message}</p> : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
