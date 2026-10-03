import { useId } from 'react';
import { createPortal } from 'react-dom';
import cx from './cx.js';
import Icon from './Icon.jsx';
import useOverlay from './useOverlay.js';

/**
 * Drawer: detail beside the list (investor profile, CRM record).
 * side: right | left. width: CSS length (default 520px, full width on phones).
 */
export default function Drawer({ open, onClose, title, description, children, footer, side = 'right', width, closeLabel = 'Close' }) {
  const id = useId();
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="ui-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        className={cx('ui-drawer', side === 'left' && 'ui-drawer-left')}
        style={width ? { '--drawer-w': width } : undefined}
      >
        <div className="ui-overlay-head">
          <div>
            <h2 id={`${id}-t`} className="ui-overlay-title">{title}</h2>
            {description && <p className="ui-overlay-desc">{description}</p>}
          </div>
          <button type="button" className="ui-overlay-x" onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" />
          </button>
        </div>
        <div className="ui-overlay-body">{children}</div>
        {footer && <div className="ui-overlay-foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}
