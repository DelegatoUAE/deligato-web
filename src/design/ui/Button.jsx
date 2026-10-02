import cx from './cx.js';
import Icon from './Icon.jsx';

/**
 * Button
 * variant: primary (navy) | accent (gold, one per view) | secondary | ghost | danger | link
 * size: sm | md | lg. `loading` keeps the width and shows a spinner.
 * `as` renders another element (e.g. a router Link) with button styling.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  iconLeft: iconLeftProp,
  icon,
  iconRight,
  iconOnly = false,
  as: As = 'button',
  type,
  className,
  children,
  ...rest
}) {
  const iconLeft = iconLeftProp ?? icon;
  const isButton = As === 'button';
  const renderIcon = (i) => (typeof i === 'string' ? <Icon name={i} /> : i);
  return (
    <As
      type={isButton ? type || 'button' : undefined}
      className={cx(
        'ui-btn',
        `ui-btn-${variant}`,
        `ui-btn-${size}`,
        block && 'ui-btn-block',
        iconOnly && 'ui-btn-icon-only',
        loading && 'is-loading',
        className,
      )}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      <span className="ui-btn-label">
        {iconLeft && <span className="ui-btn-icon">{renderIcon(iconLeft)}</span>}
        {iconOnly ? <span className="ui-btn-icon">{children}</span> : children}
        {iconRight && <span className="ui-btn-icon">{renderIcon(iconRight)}</span>}
      </span>
    </As>
  );
}
