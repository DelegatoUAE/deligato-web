import { useCallback, useMemo, useRef, useState } from 'react';
import Toast from './Toast.jsx';
import { ToastContext } from './toast-context.js';

/**
 * ToastProvider: mount once near the root. Replaces alert(), which blocks
 * the page, cannot be styled and reads as broken. Errors stay 8s, others 5s;
 * ttl: 0 keeps a toast until dismissed.
 */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((toast) => {
    const id = ++seq.current;
    const t = { id, tone: 'info', ttl: 5000, ...(typeof toast === 'string' ? { message: toast } : toast) };
    setToasts((list) => [...list.slice(-3), t]);
    if (t.ttl) setTimeout(() => dismiss(id), t.ttl);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    push,
    dismiss,
    success: (message, o) => push({ tone: 'ok', message, ...o }),
    error: (message, o) => push({ tone: 'bad', message, ttl: 8000, ...o }),
    info: (message, o) => push({ tone: 'info', message, ...o }),
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toasts" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <Toast key={t.id} tone={t.tone} title={t.title} message={t.message} action={t.action} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
