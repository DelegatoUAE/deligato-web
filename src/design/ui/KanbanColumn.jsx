import { createElement } from 'react';
import cx from './cx.js';
import { headingTag, useHeadingLevel } from './heading-context.js';

/**
 * KanbanColumn: one pipeline stage.
 * tone: neutral | navy | gold | ok | bad | info (the small stage marker).
 * empty: text shown when there are no cards. isOver: drop-target highlight.
 */
export default function KanbanColumn({ title, count, tone = 'neutral', empty = 'Nothing here yet', footer, isOver = false, className, children, ...rest }) {
  const level = useHeadingLevel();
  const hasCards = Array.isArray(children) ? children.filter(Boolean).length > 0 : Boolean(children);
  return (
    <section className={cx('ui-kcol', tone !== 'neutral' && `ui-kcol-${tone}`, isOver && 'is-over', className)} role="listitem" aria-label={`${title}, ${count ?? 0} items`} {...rest}>
      <header className="ui-kcol-head">
        {createElement(headingTag(level), { className: 'ui-kcol-title' }, title)}
        {count != null && <span className="ui-kcol-count">{count}</span>}
      </header>
      <div className="ui-kcol-body">
        {hasCards ? children : <div className="ui-kcol-empty">{empty}</div>}
      </div>
      {footer && <div className="ui-kcol-foot">{footer}</div>}
    </section>
  );
}
