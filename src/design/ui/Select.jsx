import cx from './cx.js';

/**
 * Select: native select with the field styling (native keeps mobile and
 * screen-reader behaviour right).
 * options: ['A', 'B'] or [{ value, label, disabled? }]; or pass <option> children.
 * placeholder adds an empty first option.
 */
export default function Select({ options, placeholder, className, children, ...rest }) {
  return (
    <select className={cx('ui-input', 'ui-select', className)} {...rest}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {options
        ? options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v} disabled={typeof o === 'object' ? o.disabled : undefined}>{l}</option>;
        })
        : children}
    </select>
  );
}
