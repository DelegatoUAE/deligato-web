import cx from './cx.js';
import Icon from './Icon.jsx';

/**
 * Tag: a squarer label for attributes (sector, stage, market).
 * onClick makes it a toggle (pair with `selected`); onRemove adds an x.
 */
export default function Tag({ selected = false, onClick, onRemove, removeLabel, className, children, ...rest }) {
  const cls = cx('ui-tag', selected && 'is-selected', className);
  if (onClick) {
    return (
      <button type="button" className={cls} aria-pressed={selected} onClick={onClick} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls} {...rest}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="ui-tag-x"
          onClick={onRemove}
          aria-label={removeLabel || `Remove ${typeof children === 'string' ? children : 'tag'}`}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}
