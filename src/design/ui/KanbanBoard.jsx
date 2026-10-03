import cx from './cx.js';

/** KanbanBoard: horizontal, snap-scrolling row of KanbanColumns. */
export default function KanbanBoard({ label = 'Pipeline', className, children }) {
  return (
    <div className={cx('ui-kanban', className)} role="list" aria-label={label}>
      {children}
    </div>
  );
}
