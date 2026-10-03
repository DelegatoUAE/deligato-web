import { useState } from 'react';
import { runTask } from './intelligence';

/** Runs one intelligence task on demand; 402 becomes a gate, 404 a plain note. */
export default function useTask(name) {
  const [s, setS] = useState({ loading: false, result: null, error: null, gate: null });
  async function run(body) {
    setS({ loading: true, result: null, error: null, gate: null });
    try {
      const out = await runTask(name, body);
      setS({ loading: false, result: out, error: null, gate: null });
    } catch (e) {
      if (e.status === 402 || e.upgradeRequired) setS({ loading: false, result: null, error: null, gate: e.message });
      else setS({ loading: false, result: null, error: e.status === 404 ? "This isn't connected in this environment yet." : e.message, gate: null });
    }
  }
  return [s, run];
}

