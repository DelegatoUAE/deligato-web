import cx from './cx.js';
import Skeleton from './Skeleton.jsx';

/**
 * StatTile: one figure with its label.
 * value is rendered with tabular numbers; `unit` sits after it, smaller.
 * delta: { value: '+4', direction: 'up' | 'down' | 'flat', label?: 'since last month' }
 * tone: neutral | gold | ok | bad | navy. `as="a"`/"button" makes it clickable.
 */
export default function StatTile({
  label,
  value,
  unit,
  delta,
  foot,
  tone = 'neutral',
  loading = false,
  as: As = 'div',
  className,
  ...rest
}) {
  const arrow = { up: '▲', down: '▼', flat: '■' };
  return (
    <As className={cx('ui-stat', `ui-stat-${tone}`, tone === 'navy' && 'ui-on-navy', className)} {...rest}>
      <div className="ui-stat-label">{label}</div>
      <div className="ui-stat-value">
        {loading ? <Skeleton w="2.6em" h="1.1em" /> : value}
        {!loading && unit && <span className="ui-stat-unit">{unit}</span>}
      </div>
      {(delta || foot) && (
        <div className="ui-stat-row">
          {delta && (
            <span className={`ui-delta ui-delta-${delta.direction || 'flat'}`}>
              <span aria-hidden="true">{arrow[delta.direction || 'flat']}</span>
              <span className="ui-sr">{delta.direction === 'down' ? 'down' : delta.direction === 'up' ? 'up' : 'unchanged'}</span>
              {delta.value}
            </span>
          )}
          {(delta?.label || foot) && <span className="ui-stat-foot">{delta?.label || foot}</span>}
        </div>
      )}
    </As>
  );
}
