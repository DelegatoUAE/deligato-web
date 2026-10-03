import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useApi(fn, deps): run an async loader and track it.
 * - data stays undefined until the first result for these deps arrives,
 *   so a company switch never shows the previous company's data.
 * - reload() refetches and keeps the current data visible meanwhile.
 * - setData(updater) for optimistic updates.
 * - skip: pass deps containing a falsy gate and return null from fn.
 * State is only set from promise callbacks (lint: set-state-in-effect).
 */
export default function useApi(fn, deps = []) {
  const key = JSON.stringify(deps);
  const fnRef = useRef(fn);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ key: null, nonce: -1, data: undefined, error: null });

  useEffect(() => { fnRef.current = fn; });

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => fnRef.current())
      .then(
        (data) => { if (alive) setState({ key, nonce, data, error: null }); },
        (error) => { if (alive) setState((s) => ({ key, nonce, data: s.key === key ? s.data : undefined, error })); },
      );
    return () => { alive = false; };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  const sameKey = state.key === key;
  return {
    data: sameKey ? state.data : undefined,
    error: sameKey ? state.error : null,
    loading: !sameKey || state.nonce !== nonce,
    reload,
    setData,
  };
}
