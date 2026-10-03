import { createContext, useContext } from 'react';

export const ThemeContext = createContext(null);

/** { preference: 'light'|'dark'|'system', resolved: 'light'|'dark', setPreference, remembered } */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
