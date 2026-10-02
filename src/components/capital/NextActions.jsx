import { Link } from 'react-router-dom';
import { Button } from '../../design/ui';
import ExpertBridgeLink from '../ExpertBridgeLink';

/** 00 §4.3: numbered actions, secondary-style CTA, quiet dismiss, optional calm expert line (U and R only). */
export default function NextActions({ actions, onDismiss }) {
  return (
    <ol className="nba">
      {actions.map((a, i) => (
        <li key={`${a.pool}-${a.key}`} className={`nba-item${i === 0 ? ' is-first' : ''}`}>
          <span className="nba-rank" aria-hidden="true">{a.rank}</span>
          <div className="nba-main">
            <h3 className="nba-title">{a.title}</h3>
            {a.why && <p className="nba-detail">{a.why}</p>}
            {a.bridge && (a.pool === 'U' || a.pool === 'R') && <ExpertBridgeLink kind={a.bridge.kind} gapKey={a.bridge.key} from="home" />}
          </div>
          <div className="nba-cta">
            <Button as={Link} to={a.to} variant="secondary" size="sm">{a.cta}</Button>
            {a.dismissible && onDismiss && (
              <button type="button" className="nba-x" aria-label={`Not now: ${a.title}`} title="Not now" onClick={() => onDismiss(a)}>×</button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
