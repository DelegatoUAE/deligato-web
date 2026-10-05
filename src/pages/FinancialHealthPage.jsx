import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, PageHeader, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getFinancialHealth, isUnavailable } from '../lib/companyIntel';
import { fmtUsd, fmtDate, fmtMonths } from '../lib/format';
import { LoadError } from '../components/capital/bits';
import { TrustNote, UpgradeLine, Delta, AskPrompts } from '../components/intel/IntelBits';

const STATE_LABEL = { burning: 'Burning', break_even: 'Break-even', profitable: 'Profitable', dormant: 'Dormant' };
const BAND_TONE = { Excellent: 'ok', Good: 'ok', Stable: 'info', Warning: 'warn', Critical: 'bad' };
const STATE_WHY = {
  burning: 'You spend more cash on operations than you take in, so runway leads.',
  break_even: 'Cash in and cash out are within 5% of each other, so your cash buffer leads.',
  profitable: 'Operations generate cash, so margin and cash buffer lead.',
  dormant: 'No revenue and no costs: there is nothing to score.',
};

/**
 * Financial Health v2 (financial-health.md, D37–D39, D46). The engine's own
 * output, shown as it is: score, band, state, components, vitals, strengths,
 * risks, improve, provenance ("You told us"), history (Company Intelligence).
 * Runway only when burning (D39). Weights are provisional: said quietly.
 */
export default function FinancialHealthPage() {
  const { companyId } = useCompany();
  const q = useApi(() => (companyId ? getFinancialHealth(companyId) : null), [companyId]);
  const head = (
    <>
      <SubNav section="company" />
      <PageHeader eyebrow="Company" title="Financial Health" subtitle="How your company is doing financially this month: a level you can re-check every month. It is not a readiness score." />
    </>
  );
  if (q.error) {
    return <div className="fh">{head}{isUnavailable(q.error)
      ? <EmptyState icon="chart" title="Financial Health isn't switched on here yet." body="It appears once Company Intelligence is enabled on this server." />
      : <LoadError error={q.error} onRetry={q.reload} what="your Financial Health" />}</div>;
  }
  if (!q.data) return <div className="fh">{head}<Skeleton h="220px" r="16px" /><Skeleton h="160px" r="12px" /></div>;

  const d = q.data;
  const r = d.result || {};
  if (r.status === 'insufficient_data' || (r.ok !== false && r.score == null && r.status !== 'not_applicable')) {
    return (
      <div className="fh">{head}
        <EmptyState icon="chart" title="Two minutes to your first result."
          body="Tell us last month's cash, revenue and operating costs. We calculate your Financial Health straight away, and show what changes from month to month. It also lets Conncct judge your runway and which kinds of financing suit you."
          action={<Button as={Link} to="/company/check-in" variant="accent">Do your monthly check-in</Button>} />
      </div>
    );
  }

  const v = r.vitals || {};
  const burning = r.state === 'burning';
  const ch = d.change;
  const tone = BAND_TONE[r.band] || 'neutral';
  const updated = d.snapshot?.computed_at;

  return (
    <div className="fh">
      {head}
      <section className={`fh-hero fh-${tone}`} aria-label="Your result">
        <div className="fh-score">
          {r.status === 'not_applicable' ? <span className="fh-num">Not scored</span> : <span className="fh-num">{r.score}</span>}
          <span className="fh-of">{r.status === 'not_applicable' ? '' : 'of 100'}</span>
        </div>
        <div className="fh-what">
          <p className="fh-band">{r.band && <Badge tone={tone}>{r.band}</Badge>} <span className="fh-state">{r.state_label}{r.pre_revenue ? ' · pre-revenue' : ''}</span></p>
          <p className="fh-statewhy">{STATE_WHY[r.state] || ''}</p>
          {ch && ch.delta != null && ch.delta !== 0 && (
            <p className="fh-change"><Delta direction={ch.direction}>{`${ch.from.score} → ${ch.to.score}`}</Delta> since {fmtDate(ch.from.computed_at)}{ch.state_changed ? ` · now ${r.state_label}` : ''}</p>
          )}
          {r.state_detail?.pending && <p className="ui-muted">Your figures point to {STATE_LABEL[r.state_detail.pending] || r.state_detail.pending}. The state changes after two months in a row.</p>}
          <p className="fh-src"><Badge tone="outline" size="sm">{r.provenance?.label || 'You told us'}</Badge> {updated ? `Updated ${fmtDate(updated)}` : ''}{r.provisional ? <span className="fh-prov">Weights provisional</span> : null}</p>
        </div>
        <div className="fh-act">
          <Button as={Link} to="/company/check-in" variant="secondary">Update figures</Button>
        </div>
      </section>

      {(r.overrides || []).filter((o) => o.applied).map((o) => (
        <p key={o.rule} className="fh-override" role="note">{o.reason || o.effect}</p>
      ))}

      <section className="fh-vitals" aria-label="Vitals">
        {burning && v.runway_months != null && <Vital label="Runway" value={fmtMonths(v.runway_months)} note="Cash ÷ net burn. Shown because you are burning." />}
        {!burning && v.cash_buffer_months != null && <Vital label="Cash buffer" value={fmtMonths(v.cash_buffer_months)} note="Cash ÷ monthly operating costs." />}
        <Vital label="Cash" value={fmtUsd(v.cash) || '–'} />
        <Vital label="Monthly revenue" value={fmtUsd(v.revenue) ?? '–'} />
        <Vital label="Monthly operating costs" value={fmtUsd(v.gross_burn) ?? '–'} note="Gross burn: total operating spend." />
        {burning && v.net_burn != null && <Vital label="Net burn" value={fmtUsd(v.net_burn) || '$0'} />}
        {!burning && v.margin_pct != null && <Vital label="Margin" value={`${Math.round(Number(v.margin_pct) * 10) / 10}%`} />}
      </section>

      <div className="fh-cols">
        <Lines title="Strengths" items={r.strengths} kind="ok" />
        <Lines title="Risks" items={r.risks} kind="bad" />
        <Lines title="Improve" items={r.improve} kind="gold" />
      </div>

      <details className="fh-detail">
        <summary>How the score is built</summary>
        <p className="ui-muted">For a {String(r.state_label || '').toLowerCase()} company the score adds up these parts{r.provisional ? '. The weights are provisional while we calibrate on real companies' : ''}.</p>
        <ul className="comp">
          {(r.components || []).map((c) => (
            <li key={c.key}>
              <span className="comp-l">{c.label}{!c.known && <span className="ui-faint"> · unknown, scores 0</span>}</span>
              <span className="comp-bar" aria-hidden="true"><span style={{ width: `${c.max ? Math.round((Number(c.points) / Number(c.max)) * 100) : 0}%` }} /></span>
              <span className="comp-n">{Math.round(Number(c.points) * 10) / 10} / {c.max}</span>
            </li>
          ))}
        </ul>
        {(r.unknowns || []).length > 0 && <p className="ui-muted">{r.unknowns.map((u) => `${u.label}: ${u.effect}`).join(' ')}</p>}
        {r.confidence && <p className="ui-muted">Confidence: {r.confidence.level}. {(r.confidence.reasons || []).join(' ')}</p>}
      </details>

      <section aria-labelledby="fh-hist" className="fh-hist">
        <h2 id="fh-hist" className="cc-h">History</h2>
        {d.history ? <History points={d.history} trend={d.trend} /> : (
          <>
            {d.previous ? <p>Previous result: <strong>{d.previous.score ?? 'not scored'}</strong> {d.previous.band ? `· ${d.previous.band}` : ''} on {fmtDate(d.previous.computed_at)}.</p> : <p className="ui-muted">Your first result. The next check-in shows what changed.</p>}
            <UpgradeLine note={d.locked?.note || 'Company Intelligence adds full history, trends and state-change alerts.'} />
          </>
        )}
      </section>

      <TrustNote
        what="A 0–100 level of current financial health, read with its state (burning, break-even, profitable). It is not Capital Readiness and is never combined with it."
        source={`${r.provenance?.label || 'You told us'}: the monthly figures from your check-in${d.inputs?.mode === 'periods' ? `, over ${r.state_detail?.basis || 'your recent closed months'}` : ''}. Connected books will show "From your books".`}
        updated={updated}
        why="It shows whether cash, costs and revenue are moving the right way, and when to act. Runway counts only when you are burning cash." />

      <AskPrompts prompts={['Why is my Financial Health this score?', 'What would improve it fastest?']} />
    </div>
  );
}

function Vital({ label, value, note }) {
  return (
    <div className="vital">
      <span className="vital-l">{label}</span>
      <span className="vital-v">{value}</span>
      {note && <span className="vital-n">{note}</span>}
    </div>
  );
}

function Lines({ title, items, kind }) {
  const list = (items || []).filter(Boolean);
  return (
    <section className={`lines lines-${kind}`}>
      <h3>{title}</h3>
      {list.length ? <ul>{list.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="ui-muted">None this month.</p>}
    </section>
  );
}

function History({ points, trend }) {
  const pts = (points || []).filter((p) => p.score != null);
  if (pts.length < 2) return <p className="ui-muted">Your trend appears after your next check-in.</p>;
  const W = 600; const H = 110; const pad = 8;
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1);
  const y = (s) => H - pad - (Number(s) / 100) * (H - 2 * pad);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  return (
    <figure className="hist">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Financial Health over ${pts.length} results, from ${pts[0].score} to ${pts[pts.length - 1].score}`}>
        <line x1={pad} x2={W - pad} y1={y(70)} y2={y(70)} className="hist-ref" />
        <path d={path} className="hist-line" />
        {pts.map((p, i) => <circle key={p.id || i} cx={x(i)} cy={y(p.score)} r="3.5" className="hist-dot" />)}
      </svg>
      <figcaption className="ui-muted">
        {trend?.direction ? <Delta direction={trend.direction}>{`Trend over the last ${trend.points} results`}</Delta> : null}
        {' '}Dotted line: 70, the start of Good.
      </figcaption>
      <ol className="hist-list">
        {pts.slice().reverse().slice(0, 6).map((p) => <li key={p.id}><span>{fmtDate(p.computed_at)}</span> <strong>{p.score}</strong> {p.band}{p.state ? ` · ${STATE_LABEL[p.state] || p.state}` : ''}</li>)}
      </ol>
    </figure>
  );
}
