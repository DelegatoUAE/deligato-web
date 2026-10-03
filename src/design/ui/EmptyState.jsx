import cx from './cx.js';
import Icon from './Icon.jsx';

/**
 * EmptyState: says what this is, why it is empty, and the one action that
 * fills it. "No data" is not an empty state.
 * title (required), body, action (node), icon (Icon name or node),
 * tone: neutral | gold, compact.
 */
export default function EmptyState({ icon = 'compass', title, body, action, tone = 'neutral', compact = false, className }) {
  return (
    <div className={cx('ui-empty', `ui-empty-${tone}`, compact && 'ui-empty-compact', className)}>
      <div className="ui-empty-icon" aria-hidden="true">
        {typeof icon === 'string' && icon.length > 2 ? <Icon name={icon} /> : icon}
      </div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
