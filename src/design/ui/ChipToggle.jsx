/**
 * ChipToggle: multi-select (or single with `single`) pill choices.
 * options: ['Seed', ...] or [{ key, label }]; value: array of keys.
 */
export default function ChipToggle({ options = [], value = [], onChange, single = false, label }) {
  function toggle(key) {
    if (single) return onChange?.(value?.[0] === key ? [] : [key]);
    onChange?.(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  }
  return (
    <div className="ui-chips" role="group" aria-label={label}>
      {options.map((o) => {
        const k = typeof o === 'string' ? o : o.key;
        const l = typeof o === 'string' ? o : o.label;
        const on = value.includes(k);
        return (
          <button type="button" key={k} className={`ui-chip${on ? ' is-on' : ''}`} onClick={() => toggle(k)} aria-pressed={on}>
            {l}
          </button>
        );
      })}
    </div>
  );
}
