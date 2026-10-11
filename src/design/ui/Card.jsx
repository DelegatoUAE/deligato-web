import { createElement } from 'react';
import cx from './cx.js';
import { HeadingLevel, headingTag, useHeadingLevel } from './heading-context.js';

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
  titleAs,
  className,
  children,
  ...rest
}) {
  const padded = paddedProp ?? pad ?? true;
  const level = useHeadingLevel();
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
            {title && createElement(titleAs || headingTag(level), { className: 'ui-card-title' }, title)}
            {subtitle && <p className="ui-card-sub">{subtitle}</p>}
          </div>
          {action && <div className="ui-card-action">{action}</div>}
        </div>
      )}
      {title ? <HeadingLevel.Provider value={level + 1}>{children}</HeadingLevel.Provider> : children}
      {footer && <div className="ui-card-foot">{footer}</div>}
    </As>
  );
}
