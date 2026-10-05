import { createElement } from 'react';
import cx from './cx.js';
import { HeadingLevel, headingTag, useHeadingLevel } from './heading-context.js';

/**
 * Panel: a feature surface, larger radius than a card.
 * tone="navy" re-points every token inside to the navy surface, so any
 * primitive placed in it (badges, buttons, stat tiles, fit rows) reads
 * correctly without its own dark variant. tone="cream" is a quiet inset.
 */
export default function Panel({
  as: As = 'section',
  tone = 'navy',
  eyebrow,
  title,
  subtitle,
  action,
  className,
  children,
  ...rest
}) {
  const level = useHeadingLevel();
  return (
    <As className={cx('ui-panel', `ui-panel-${tone}`, tone === 'navy' && 'ui-on-navy', className)} {...rest}>
      {(title || subtitle || action || eyebrow) && (
        <div className="ui-panel-head">
          <div>
            {eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}
            {title && createElement(headingTag(level), { className: 'ui-panel-title' }, title)}
            {subtitle && <p className="ui-panel-sub">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {title ? <HeadingLevel.Provider value={level + 1}>{children}</HeadingLevel.Provider> : children}
    </As>
  );
}
