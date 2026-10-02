import cx from './cx.js';
import FitRow from './FitRow.jsx';

/**
 * FitList: a list of FitRows from data, or wrap your own FitRow children.
 * items: [{ key?, label, state, detail }]
 */
export default function FitList({ items, label, className, children }) {
  return (
    <ul className={cx('ui-fitlist', className)} aria-label={label}>
      {items ? items.map((it, i) => <FitRow key={it.key || it.label || i} {...it} />) : children}
    </ul>
  );
}
