import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme-context';
import {
  DARK_QUERY, THEME_KEY, applyTheme, isPreference, readPreference, resolveTheme, systemPrefersDark, writePreference,
} from '../lib/theme';

const storage = () => { try { return window.localStorage; } catch { return null; } };

/**
 * Appearance (D54). index.html has already put the right data-theme on <html>
 * before React rendered; this keeps it in step with the user's choice, the OS
 * setting (when on System) and other tabs.
 */
export default function ThemeProvider({ children }) {
  const [preference, setPref] = useState(() => readPreference(storage()));
  const [systemDark, setSystemDark] = useState(() => systemPrefersDark(window));
  const [remembered, setRemembered] = useState(true);
  const resolved = resolveTheme(preference, systemDark);

  useEffect(() => { applyTheme(document, preference, resolved); }, [preference, resolved]);

  useEffect(() => {
    let mq;
    try { mq = window.matchMedia?.(DARK_QUERY); } catch { mq = null; }
    if (!mq?.addEventListener) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === THEME_KEY) setPref(readPreference(storage())); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next) => {
    if (!isPreference(next)) return;
    setPref(next);
    setRemembered(writePreference(storage(), next));
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference, remembered }), [preference, resolved, setPreference, remembered]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
