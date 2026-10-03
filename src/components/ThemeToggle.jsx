import { useRef } from 'react';
import { Icon } from '../design/ui';
import { useTheme } from './theme-context';
import { PREFERENCES, PREFERENCE_LABELS } from '../lib/theme';

const ICONS = { light: 'sun', dark: 'moon', system: 'monitor' };

/**
 * Quick appearance switch for the top bar and the auth pages: a three-way
 * radio group (Light / Dark / System). Arrow keys move and select, Tab enters
 * on the current choice, as a native radio group does.
 */
export default function ThemeToggle({ className = '' }) {
  const { preference, resolved, setPreference } = useTheme();
  const refs = useRef({});

  function onKeyDown(e) {
    const i = PREFERENCES.indexOf(preference);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next = null;
    if (step) next = PREFERENCES[(i + step + PREFERENCES.length) % PREFERENCES.length];
    if (e.key === 'Home') next = PREFERENCES[0];
    if (e.key === 'End') next = PREFERENCES[PREFERENCES.length - 1];
    if (!next) return;
    e.preventDefault();
    setPreference(next);
    refs.current[next]?.focus();
  }

  return (
    <div className={`themetoggle ${className}`.trim()} role="radiogroup" aria-label="Appearance" onKeyDown={onKeyDown}>
      {PREFERENCES.map((p) => {
        const on = p === preference;
        const label = p === 'system' ? `System (now ${resolved})` : PREFERENCE_LABELS[p];
        return (
          <button
            key={p}
            ref={(el) => { refs.current[p] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            tabIndex={on ? 0 : -1}
            className={`themetoggle-opt${on ? ' is-on' : ''}`}
            onClick={() => setPreference(p)}
          >
            <Icon name={ICONS[p]} />
          </button>
        );
      })}
    </div>
  );
}
