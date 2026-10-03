import { Card } from '../design/ui';
import { useTheme } from './theme-context';
import { PREFERENCES, PREFERENCE_LABELS } from '../lib/theme';

const HINTS = {
  light: 'Cream and white surfaces.',
  dark: 'Deep navy surfaces, easier on the eyes at night.',
  system: 'Follows your device setting.',
};

/** Settings → Account: the Light / Dark / System choice (D54). */
export default function AppearanceSetting() {
  const { preference, resolved, setPreference, remembered } = useTheme();
  return (
    <Card title="Appearance" subtitle="How Deligato looks on this device.">
      <fieldset className="appearance">
        <legend className="ui-sr">Theme</legend>
        {PREFERENCES.map((p) => (
          <label key={p} className={`appearance-opt${p === preference ? ' is-on' : ''}`}>
            <input type="radio" name="appearance" value={p} checked={p === preference} onChange={() => setPreference(p)} />
            <span className={`appearance-swatch appearance-swatch-${p}`} aria-hidden="true" />
            <span className="appearance-text">
              <strong>{PREFERENCE_LABELS[p]}</strong>
              <span className="ui-muted">{p === 'system' ? `${HINTS.system} Now ${resolved}.` : HINTS[p]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {!remembered && <p className="ui-faint appearance-note">This browser is blocking site storage, so the choice applies until you close this tab.</p>}
    </Card>
  );
}
