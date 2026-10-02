import cx from './cx.js';

const MARK = { ok: '✓', bad: '!', info: 'i', neutral: '•' };

/**
 * Toast: one transient notification (navy, with a toned mark).
 * Usually rendered by ToastProvider; render it directly with `inline`
 * for static previews.
 */
export default function Toast({ tone = 'info', title, message, children, action, onDismiss, inline = false }) {
  return (
    <div className={cx('ui-toast', `ui-toast-${tone}`, inline && 'ui-toast-inline')} role={tone === 'bad' ? 'alert' : 'status'}>
      <span className="ui-toast-mark" aria-hidden="true">{MARK[tone] || MARK.neutral}</span>
      <div className="ui-toast-body">
        {title && <strong>{title}</strong>}
        {(message || children) && (title ? <p>{message || children}</p> : <strong style={{ fontWeight: 500 }}>{message || children}</strong>)}
        {action && <div className="ui-toast-action">{action}</div>}
      </div>
      {onDismiss && <button type="button" className="ui-toast-x" onClick={onDismiss} aria-label="Dismiss notification">×</button>}
    </div>
  );
}
