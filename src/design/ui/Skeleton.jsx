import cx from './cx.js';

/**
 * Skeleton: a placeholder in the shape of what is loading, so the layout
 * does not jump when data arrives. Replaces "Loading..." text.
 * variant: block (default) | circle | text (renders `lines` lines).
 */
export default function Skeleton({ w = '100%', h = '1em', r, variant = 'block', lines = 3, className }) {
  if (variant === 'text') {
    return (
      <span className="ui-skel-text" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="ui-skel" style={{ width: i === lines - 1 ? '62%' : w, height: '0.8em' }} />
        ))}
      </span>
    );
  }
  return (
    <span
      className={cx('ui-skel', variant === 'circle' && 'ui-skel-circle', className)}
      style={{ width: w, height: variant === 'circle' ? w : h, borderRadius: r }}
      aria-hidden="true"
    />
  );
}
