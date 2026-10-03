import cx from './cx.js';

/**
 * KanbanCard: one record in a pipeline column.
 * leading: node at top-left (e.g. an org Avatar). score: short figure on
 * the right (e.g. match score). meta: one line under the title.
 * footer: badges, next step, due date. stale: gold edge for "needs a nudge".
 * onClick or as="a" makes it interactive.
 */
export default function KanbanCard({ title, meta, leading, score, footer, stale = false, dragging = false, onClick, as, className, children, ...rest }) {
  const As = as || (onClick ? 'button' : 'article');
  return (
    <As
      type={As === 'button' ? 'button' : undefined}
      className={cx('ui-kcard', stale && 'is-stale', dragging && 'is-dragging', className)}
      onClick={onClick}
      {...rest}
    >
      <div className="ui-kcard-top">
        {leading}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ui-kcard-title">{title}</div>
          {meta && <div className="ui-kcard-meta">{meta}</div>}
        </div>
        {score != null && <span className="ui-kcard-score">{score}</span>}
      </div>
      {children}
      {footer && <div className="ui-kcard-foot">{footer}</div>}
    </As>
  );
}
