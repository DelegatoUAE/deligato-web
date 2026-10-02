import { useId } from 'react';
import { createPortal } from 'react-dom';
import cx from './cx.js';
import Icon from './Icon.jsx';
import useOverlay from './useOverlay.js';

/**
 * Modal: a focused decision. Escape, scrim click and the x all call onClose.
 * size: sm | md | lg. footer holds the actions (primary last, on the right).
 * On phones it docks to the bottom as a sheet.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', closeLabel = 'Close', dismissible = true }) {
  const id = useId();
  const ref = useOverlay(open, dismissible ? onClose : undefined);
  if (!open) return null;
  return createPortal(
    <div className="ui-scrim" onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={description ? `${id}-d` : undefined}
        tabIndex={-1}
        className={cx('ui-modal', 'has-parts', size !== 'md' && `ui-modal-${size}`)}
      >
        <div className="ui-overlay-head">
          <div>
            <h2 id={`${id}-t`} className="ui-overlay-title">{title}</h2>
            {description && <p id={`${id}-d`} className="ui-overlay-desc">{description}</p>}
          </div>
          {dismissible && (
            <button type="button" className="ui-overlay-x" onClick={onClose} aria-label={closeLabel}>
              <Icon name="close" />
            </button>
          )}
        </div>
        {children && <div className="ui-overlay-body">{children}</div>}
        {footer && <div className="ui-overlay-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
