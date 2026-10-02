import cx from './cx.js';

/**
 * Input: text input. `prefix` renders a fixed affix inside (e.g. "$"),
 * `numeric` switches to tabular figures.
 */
export default function Input({ prefix, numeric = false, className, ...rest }) {
  const input = <input className={cx('ui-input', numeric && 'ui-input-num', className)} inputMode={numeric ? 'decimal' : undefined} {...rest} />;
  if (!prefix) return input;
  return (
    <div className="ui-input-group">
      <span className="ui-input-affix" aria-hidden="true">{prefix}</span>
      {input}
    </div>
  );
}
