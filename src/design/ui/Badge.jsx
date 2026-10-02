import cx from './cx.js';

/**
 * Badge: a read-only status label.
 * tone: neutral | brand | gold | ok | warn | bad | info | outline. `dot` adds
 * a leading dot. For removable or selectable labels use Tag.
 */
export default function Badge({ tone = 'neutral', size = 'md', dot = false, className, children, ...rest }) {
  return (
    <span className={cx('ui-badge', `ui-badge-${tone}`, `ui-badge-${size}`, dot && 'ui-badge-dot', className)} {...rest}>
      {children}
    </span>
  );
}
