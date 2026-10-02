import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/**
 * useToast(): { push, dismiss, success, error, info }
 *   success('Draft saved') / error('Could not allocate: ...') / info(...)
 *   push({ tone: 'ok' | 'bad' | 'info' | 'neutral', title?, message, ttl?, action? })
 * Must be inside <ToastProvider>.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
