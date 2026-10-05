import { Children, cloneElement, isValidElement, useId } from 'react';
import cx from './cx.js';
import Icon from './Icon.jsx';

/**
 * FormField: label + control + hint or error, wired for screen readers.
 * The single child control gets id, aria-describedby and aria-invalid
 * injected. Or pass a function child: (id, describedBy) => <input .../>.
 * required shows *, optional shows "Optional". wide spans a ui-form grid.
 */
export default function FormField({ label, hint, error, required = false, optional = false, wide = false, className, children }) {
  const autoId = useId();
  const only = typeof children === 'function' ? [] : Children.toArray(children);
  const single = only.length === 1 && isValidElement(only[0]) ? only[0] : null;
  // A control that brings its own id (e.g. a #target-date deep link) keeps
  // it, and the label points at that id, so the two stay associated.
  const id = (single && single.props.id) || autoId;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = error ? errId : hint ? hintId : undefined;

  let control;
  if (typeof children === 'function') {
    control = children(id, describedBy);
  } else {
    control = single
      ? cloneElement(single, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required: required || single.props.required,
      })
      : children;
  }

  return (
    <div className={cx('ui-field', wide && 'is-wide', error && 'has-error', className)}>
      {label && (
        <label className="ui-label" htmlFor={id}>
          {label}
          {required && <span className="ui-req" aria-hidden="true">*</span>}
          {optional && <span className="ui-label-opt">Optional</span>}
        </label>
      )}
      {control}
      {error ? (
        <span id={errId} className="ui-field-error"><Icon name="alert" />{error}</span>
      ) : hint ? (
        <span id={hintId} className="ui-field-hint">{hint}</span>
      ) : null}
    </div>
  );
}
