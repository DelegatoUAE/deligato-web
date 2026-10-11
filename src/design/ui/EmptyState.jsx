import { createElement } from 'react';
import cx from './cx.js';
import Icon from './Icon.jsx';
import { headingTag, useHeadingLevel } from './heading-context.js';

/**
 * EmptyState: says what this is, why it is empty, and the one action that
 * fills it. "No data" is not an empty state.
 * title (required), body, action (node), icon (Icon name or node),
 * tone: neutral | gold, compact.
 */
export default function EmptyState({ icon = 'compass', title, body, action, tone = 'neutral', compact = false, className }) {
  const level = useHeadingLevel();
  return (
    <div className={cx('ui-empty', `ui-empty-${tone}`, compact && 'ui-empty-compact', className)}>
      <div className="ui-empty-icon" aria-hidden="true">
        {typeof icon === 'string' && icon.length > 2 ? <Icon name={icon} /> : icon}
      </div>
      {createElement(headingTag(level), { className: 'ui-empty-title' }, title)}
      {body && <p>{body}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
