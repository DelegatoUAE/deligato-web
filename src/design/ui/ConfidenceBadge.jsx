import cx from './cx.js';

const WORD = { high: 'High', medium: 'Medium', low: 'Low' };

/**
 * ConfidenceBadge: how sure the system is about a score or match.
 * level: high | medium | low. Signal bars plus a word, never colour alone.
 * Low is amber so it gets noticed; none of the levels are green, because
 * confidence is about certainty, not about how good the result is.
 */
export default function ConfidenceBadge({ level = 'medium', size = 'md', label = 'confidence', className, title }) {
  const l = WORD[level] ? level : 'low';
  return (
    <span
      className={cx('ui-conf', `ui-conf-${l}`, size === 'sm' && 'ui-conf-sm', className)}
      title={title}
    >
      <span className="ui-conf-bars" aria-hidden="true"><i /><i /><i /></span>
      {WORD[l]} {label}
    </span>
  );
}
