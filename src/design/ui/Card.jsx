import cx from './cx.js';

/**
 * Card: the default content container.
 * tone: default | sunken | outline. `interactive` adds hover + focus for
 * clickable cards (pass onClick or as="a"). `selected` draws the gold edge.
 * title/subtitle/eyebrow/action render a standard header; footer renders a
 * tinted strip at the bottom.
 */
export default function Card({
  as: As = 'section',
  tone = 'default',
  padded: paddedProp,
  pad,
  interactive = false,
  selected = false,
  eyebrow,
  title,
  subtitle,
  action,
  footer,
  titleAs: TitleAs = 'h3',
  className,
  children,
  ...rest
}) {
  const padded = paddedProp ?? pad ?? true;
  const hasHead = title || subtitle || action || eyebrow;
  return (
    <As
      className={cx(
        'ui-card',
        tone !== 'default' && `ui-card-${tone}`,
        padded && 'is-padded',
        interactive && 'ui-card-interactive',
        selected && 'ui-card-selected',
        className,
      )}
      tabIndex={interactive && As !== 'a' && As !== 'button' ? 0 : undefined}
      {...rest}
    >
      {hasHead && (
        <div className="ui-card-head">
          <div>
            {eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}
            {title && <TitleAs className="ui-card-title">{title}</TitleAs>}
            {subtitle && <p className="ui-card-sub">{subtitle}</p>}
          </div>
          {action && <div className="ui-card-action">{action}</div>}
        </div>
      )}
      {children}
      {footer && <div className="ui-card-foot">{footer}</div>}
    </As>
  );
}
