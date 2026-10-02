import cx from './cx.js';
import Skeleton from './Skeleton.jsx';

/**
 * Table: a data table in a scrolling card.
 * columns: [{ key, header, align?: 'left' | 'right' | 'center', numeric?, width?, render?(row) }]
 * rows, rowKey (field name or fn). onRowClick makes rows focusable and
 * clickable (Enter/Space too). empty: node shown when rows is empty.
 * loading renders skeleton rows. dense tightens padding.
 */
export default function Table({ columns = [], rows = [], rowKey = 'id', onRowClick, empty, loading = false, loadingRows = 4, dense = false, caption, className }) {
  const keyOf = (r, i) => (typeof rowKey === 'function' ? rowKey(r) : r[rowKey] ?? i);
  const alignCls = (c) => (c.numeric || c.align === 'right' ? 'is-num' : c.align === 'center' ? 'is-center' : undefined);
  return (
    <div className={cx('ui-table-wrap', className)}>
      <table className={cx('ui-table', dense && 'ui-table-dense')}>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={alignCls(c)} style={c.width ? { width: c.width } : undefined}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: loadingRows }, (_, i) => (
            <tr key={`sk${i}`}>
              {columns.map((c) => (
                <td key={c.key} className={alignCls(c)}><Skeleton w={c.numeric ? '3em' : '70%'} h="0.9em" /></td>
              ))}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr className="ui-table-empty"><td colSpan={columns.length}>{empty || 'Nothing to show yet.'}</td></tr>
          )}
          {!loading && rows.map((r, i) => (
            <tr
              key={keyOf(r, i)}
              className={onRowClick ? 'is-clickable' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(r); } } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={alignCls(c)}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
