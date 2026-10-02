import { Link } from 'react-router-dom';
import { ScoreRing, Badge } from '../../design/ui';
import { fmtDate, daysSince } from '../../lib/format';
import { bandOf, provisionalText, bandLabel, readinessSource } from '../../lib/readiness';
import { Badge as SrcBadge } from '../../design/ui';

export function BandChip({ readiness }) {
  const { name, tone } = bandOf(readiness);
  if (!name) return null;
  const p = provisionalText(readiness);
  return (
    <span className={`bandchip bandchip-${tone || 'none'}${p ? ' is-provisional' : ''}`}>
      {name}{p ? ` · ${p}` : ''}
    </span>
  );
}

function factorLabel(r, key) {
  if (!key) return null;
  if (typeof key === 'object') return key.label || key.key || null;
  return r?.factors?.find((f) => f.key === key)?.label || key;
}

/** Score exactly as sent on the Company page; integer elsewhere (ia.md §7.4). */
function displayScore(score, exact) {
  if (score === null || score === undefined) return null;
  return exact ? Number(score) : Math.round(Number(score));
}

/**
 * ReadinessSnapshot: the Conncct readiness, read-only.
 * variant compact (dashboard, welcome) | full (company page, factor bars).
 */
export function ReadinessSnapshot({ readiness, variant = 'compact', conncctHref, showLink = true, source }) {
  const src = readinessSource(source);
  const r = readiness;
  const { name, tone, description } = bandOf(r);
  const prov = provisionalText(r);
  const stale = daysSince(r?.computed_at) > 90;
  const gap = factorLabel(r, r?.insight?.biggest_gap);
  const exact = variant === 'full';
  const value = displayScore(r?.score, exact);

  return (
    <div className={`rsnap rsnap-${variant}`}>
      <div className="rsnap-dial">
        <ScoreRing variant="readiness" value={value === null ? null : Math.round(value)} band={prov ? undefined : name} bandTone={tone} label="Readiness" size={variant === 'full' ? 'md' : 'sm'} />
        {exact && value !== null && <div className="rsnap-exact">Score as sent by Conncct: <strong>{value}</strong></div>}
      </div>
      <div className="rsnap-body">
        <div className="rsnap-chips"><BandChip readiness={r} /><SrcBadge tone="outline" size="sm">{src.label}</SrcBadge></div>
        {variant === 'full' && description && !prov && <p className="rsnap-desc">{description}</p>}
        {prov && <p className="rsnap-desc">Your readiness isn't final yet. Finish your readiness in Conncct.</p>}
        {gap && variant !== 'full' && <p className="rsnap-gap">Biggest gap: <strong>{gap}</strong></p>}
        <p className="rsnap-meta">
          {src.foot} {fmtDate(r?.computed_at) || 'an unknown date'}
          {variant === 'full' && r?.methodology_version ? ` · methodology v${r.methodology_version}` : ''}
        </p>
        {stale && (
          <p className="rsnap-stale">This score is from {fmtDate(r.computed_at)}. Update it in Conncct for current advice.</p>
        )}
        {showLink && variant !== 'full' && <Link to="/capital/readiness" className="rsnap-link">View details</Link>}
        {variant === 'full' && conncctHref && (
          <a className="rsnap-link" href={conncctHref} target="_blank" rel="noreferrer">To change this score, update your answers in Conncct ↗</a>
        )}
      </div>
    </div>
  );
}

const STATUS_WORD = { met: 'met', partial: 'partial', missing: 'missing', unknown: 'unknown' };

/** Factor bars in payload order. Unknown is dashed, never a fail. */
export function FactorBars({ readiness }) {
  const factors = readiness?.factors || [];
  if (!factors.length) return <p className="ui-muted">Conncct sent the score without a factor breakdown.</p>;
  const gapKey = typeof readiness?.insight?.biggest_gap === 'object' ? readiness.insight.biggest_gap?.key : readiness?.insight?.biggest_gap;
  return (
    <ul className="factors">
      {factors.map((f) => {
        const st = STATUS_WORD[f.status] ? f.status : 'unknown';
        const pctv = f.max ? Math.max(0, Math.min(100, (Number(f.points) / Number(f.max)) * 100)) : 0;
        return (
          <li key={f.key} className={`factor factor-${st}`}>
            <span className="factor-label">{f.label || f.key}{gapKey === f.key && <Badge tone="warn" size="sm">Biggest gap</Badge>}</span>
            <span className="factor-bar" aria-hidden="true"><i style={{ width: st === 'unknown' ? '0%' : `${pctv}%` }} /></span>
            <span className="factor-val">
              {st === 'unknown' ? 'unknown' : `${f.points} / ${f.max}`}
              <span className="ui-sr">, {STATUS_WORD[st]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Topbar pill: "Readiness 74 · Investor-Ready · from Conncct". */
export function ReadinessPill({ readiness, source }) {
  if (!readiness) return <Link to="/capital/readiness/assess" className="rpill rpill-none">Readiness · not scored yet</Link>;
  const { tone } = bandOf(readiness);
  return (
    <Link to="/capital/readiness" className={`rpill rpill-${tone || 'none'}`} title="Your Capital Readiness Score, from Conncct">
      <span className="rpill-dot" aria-hidden="true" />
      Readiness {Math.round(Number(readiness.score))} · {bandLabel(readiness)}<span className="rpill-src"> · {readinessSource(source).key === 'embedded' ? 'assessed here' : 'Conncct'}</span>
    </Link>
  );
}
