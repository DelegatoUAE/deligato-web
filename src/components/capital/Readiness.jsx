import { Link } from 'react-router-dom';
import { ScoreRing, Badge } from '../../design/ui';
import { fmtDate, daysSince } from '../../lib/format';
import { bandOf, provisionalText, bandLabel, readinessSource, readinessGaps, factorName, notAsked } from '../../lib/readiness';
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

/** I-01: "Biggest gap" is the first of "Your gaps" (the method's improvements[] order). */
function firstGapLabel(r) {
  const g = readinessGaps(r)[0];
  if (!g) return null;
  return factorName(r?.factors?.find((f) => f.key === g.factor) || g);
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
  const gap = firstGapLabel(r);
  const exact = variant === 'full';
  const value = displayScore(r?.score, exact);

  return (
    <div className={`rsnap rsnap-${variant}`}>
      <div className="rsnap-dial">
        <ScoreRing variant="readiness" value={value === null ? null : Math.round(value)} band={prov ? undefined : name} bandTone={tone} label="Readiness" size={variant === 'full' ? 'md' : 'sm'} />
        {exact && value !== null && value !== Math.round(value) && <div className="rsnap-exact">Exact score: <strong>{value}</strong></div>}
      </div>
      <div className="rsnap-body">
        <div className="rsnap-chips">{(variant !== 'full' || prov) && <BandChip readiness={r} />}<SrcBadge tone="outline" size="sm">{src.label}</SrcBadge></div>
        {variant === 'full' && description && !prov && <p className="rsnap-desc">{description}</p>}
        {prov && <p className="rsnap-desc">Your readiness isn't final yet. Some questions are still unanswered.</p>}
        {gap && variant !== 'full' && <p className="rsnap-gap">Biggest gap: <strong>{gap}</strong></p>}
        <p className="rsnap-meta">
          {src.foot} {fmtDate(r?.computed_at) || 'an unknown date'}
          {variant === 'full' && r?.methodology_version ? ` · methodology v${r.methodology_version}` : ''}
        </p>
        {stale && (
          <p className="rsnap-stale">This score is from {fmtDate(r.computed_at)}. Update your answers for current advice.</p>
        )}
        {showLink && variant !== 'full' && <Link to="/capital/readiness" className="rsnap-link">View details</Link>}
        {variant === 'full' && conncctHref && (
          <p className="rsnap-meta">This score was imported from your readiness partner. Changes to it are made there.</p>
        )}
      </div>
    </div>
  );
}

const STATUS_WORD = { met: 'met', partial: 'partial', missing: 'missing', unknown: 'unknown' };

/** Factor bars in payload order. Unknown is dashed, never a fail. */
export function FactorBars({ readiness }) {
  const factors = readiness?.factors || [];
  if (!factors.length) return <p className="ui-muted">This score arrived without a factor breakdown.</p>;
  const gapKey = readinessGaps(readiness)[0]?.factor;
  return (
    <ul className="factors">
      {factors.map((f) => {
        const st = STATUS_WORD[f.status] ? f.status : 'unknown';
        const pctv = f.max ? Math.max(0, Math.min(100, (Number(f.points) / Number(f.max)) * 100)) : 0;
        return (
          <li key={f.key} className={`factor factor-${st}`}>
            <span className="factor-label">{factorName(f)}{gapKey === f.key && <Badge tone="warn" size="sm">First gap</Badge>}</span>
            <span className="factor-bar" aria-hidden="true"><i style={{ width: st === 'unknown' ? '0%' : `${pctv}%` }} /></span>
            <span className="factor-val">
              {notAsked(f) ? 'Not asked yet' : `${f.points} / ${f.max}`}
              <span className="ui-sr">, {STATUS_WORD[st]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Topbar pill: "Readiness 74 · Investor-Ready". Where the score came from is on the Readiness page, not jargon in the header. */
export function ReadinessPill({ readiness }) {
  if (!readiness) return <Link to="/capital/readiness/assess" className="rpill rpill-none">Readiness · not scored yet</Link>;
  const { tone } = bandOf(readiness);
  return (
    <Link to="/capital/readiness" className={`rpill rpill-${tone || 'none'}`} title="Your Capital Readiness Score (Conncct method)">
      <span className="rpill-dot" aria-hidden="true" />
      Readiness {Math.round(Number(readiness.score))} · {bandLabel(readiness)}
    </Link>
  );
}
