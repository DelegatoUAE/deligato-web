import cx from './cx.js';

const STATUS_WORD = { done: 'completed', current: 'current step', upcoming: 'not started', blocked: 'blocked' };

/**
 * ProgressSteps: the founder journey stepper.
 * steps: [{ id?, label, description?, status: done | current | upcoming | blocked, href?, onClick? }]
 * If no step carries a status, pass `current` (index) and statuses are derived.
 * orientation: horizontal (scrolls on narrow screens) | vertical.
 * compact hides descriptions and shrinks markers (good for a side rail).
 */
export default function ProgressSteps({ steps = [], current, orientation = 'horizontal', compact = false, label = 'Progress', className }) {
  const list = steps.map((s, i) => ({
    ...s,
    status: s.status || (current == null ? 'upcoming' : i < current ? 'done' : i === current ? 'current' : 'upcoming'),
  }));
  return (
    <ol
      className={cx('ui-steps', orientation === 'vertical' && 'ui-steps-vertical', compact && 'ui-steps-compact', className)}
      aria-label={label}
    >
      {list.map((s, i) => {
        const marker = (
          <span className="ui-step-marker" aria-hidden="true">
            {s.status === 'done' ? '✓' : s.status === 'blocked' ? '!' : i + 1}
          </span>
        );
        const text = (
          <span className="ui-step-text">
            <span className="ui-step-label">{s.label}</span>
            {s.description && <span className="ui-step-desc">{s.description}</span>}
            <span className="ui-sr">, {STATUS_WORD[s.status]}</span>
          </span>
        );
        const inner = s.href ? (
          <a className="ui-step-link" href={s.href} aria-current={s.status === 'current' ? 'step' : undefined}>{marker}{text}</a>
        ) : s.onClick ? (
          <button type="button" className="ui-step-link" onClick={s.onClick} aria-current={s.status === 'current' ? 'step' : undefined}>{marker}{text}</button>
        ) : (
          <>{marker}{text}</>
        );
        return (
          <li
            key={s.id || s.label}
            className={cx('ui-step', `is-${s.status}`)}
            aria-current={!s.href && !s.onClick && s.status === 'current' ? 'step' : undefined}
          >
            {inner}
          </li>
        );
      })}
    </ol>
  );
}
