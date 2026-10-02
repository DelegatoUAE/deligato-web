import cx from './cx.js';

/** Textarea: multi-line input with the field styling. */
export default function Textarea({ className, ...rest }) {
  return <textarea className={cx('ui-input', 'ui-textarea', className)} {...rest} />;
}
