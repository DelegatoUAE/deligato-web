import { Link } from 'react-router-dom';
import { Button } from '../../design/ui';
import { conncctLink } from '../../lib/companies';

const SOURCE = { raise: 'Your raise', match: 'Matches', readiness: 'Readiness · Conncct', pipeline: 'Pipeline' };

/** Ranked next actions. Where a gap maps to expertise, a calm expert link (D13). */
export default function NextActions({ actions, company }) {
  return (
    <ol className="nba">
      {actions.map((a, i) => (
        <li key={a.id} className={`nba-item${i === 0 ? ' is-first' : ''}`}>
          <span className="nba-rank" aria-hidden="true">{i + 1}</span>
          <div className="nba-main">
            <span className="nba-source">{SOURCE[a.source]}</span>
            <h3 className="nba-title">{a.title}</h3>
            {a.detail && <p className="nba-detail">{a.detail}</p>}
            {a.expertise && (
              <Link className="nba-expert" to={`/experts?skill=${encodeURIComponent(a.expertise)}&factor=${encodeURIComponent(a.factor || '')}`}>
                Need help? Find a matched {a.expertise.toLowerCase()} expert →
              </Link>
            )}
          </div>
          <div className="nba-cta">
            {a.href === 'conncct'
              ? <Button as="a" href={conncctLink(company, 'readiness')} target="_blank" rel="noreferrer" variant="secondary" size="sm">{a.cta}</Button>
              : <Button as={Link} to={a.to} variant={i === 0 ? 'accent' : 'secondary'} size="sm">{a.cta}</Button>}
          </div>
        </li>
      ))}
    </ol>
  );
}
