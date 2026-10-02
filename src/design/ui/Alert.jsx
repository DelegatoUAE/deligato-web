import cx from './cx.js';
import Icon from './Icon.jsx';

const ICON = { info: 'info', ok: 'check', warn: 'alert', bad: 'alert', brand: 'info' };

/**
 * Alert: an inline message in the page flow.
 * tone: info | ok | warn | bad | brand. bad uses role="alert"; others are polite.
 */
export default function Alert({ tone = 'info', title, children, onDismiss, action, className }) {
  return (
    <div className={cx('ui-alert', `ui-alert-${tone}`, className)} role={tone === 'bad' ? 'alert' : 'status'}>
      <Icon name={ICON[tone] || 'info'} />
      <div className="ui-alert-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="ui-alert-action">{action}</div>}
      {onDismiss && (
        <button type="button" className="ui-alert-x" onClick={onDismiss} aria-label="Dismiss">×</button>
      )}
    </div>
  );
}
