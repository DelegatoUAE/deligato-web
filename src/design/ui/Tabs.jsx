import { useId, useRef } from 'react';
import cx from './cx.js';

/**
 * Tabs: controlled tab list with optional panel.
 * items: [{ id, label, count?, disabled? }], value, onChange(id)
 * variant: underline (page sections) | pill (segmented filter)
 * children: optional function (activeId) => panel content; rendered in a
 * role="tabpanel" wired to the active tab. Arrow keys, Home and End move focus.
 */
export default function Tabs({ items = [], value, onChange, variant = 'underline', label = 'Sections', className, children }) {
  const base = useId();
  const refs = useRef({});
  const enabled = items.filter((t) => !t.disabled);

  function onKey(e) {
    const i = enabled.findIndex((t) => t.id === value);
    let next;
    if (e.key === 'ArrowRight') next = enabled[(i + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(i - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      onChange?.(next.id);
      refs.current[next.id]?.focus();
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className={cx('ui-tabs', `ui-tabs-${variant}`)} onKeyDown={onKey}>
        {items.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={active}
              aria-controls={children ? `${base}-panel` : undefined}
              tabIndex={active ? 0 : -1}
              disabled={t.disabled}
              className={cx('ui-tab', active && 'is-active')}
              onClick={() => onChange?.(t.id)}
            >
              {t.label}
              {t.count != null && <span className="ui-tab-count">{t.count}</span>}
            </button>
          );
        })}
      </div>
      {typeof children === 'function' && (
        <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${value}`} tabIndex={0} className="ui-tabpanel">
          {children(value)}
        </div>
      )}
    </div>
  );
}
