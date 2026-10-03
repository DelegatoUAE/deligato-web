import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Icon, Skeleton } from '../../design/ui';
import useTask from '../../lib/useTask';
import { fmtDate, stealthLabel, wordsForCodes, stripEvidenceIds } from '../../lib/format';
import { upgradeHref } from '../../lib/plan';

// Server text is already cleaned (api 2f2a75f); these stay as a fallback.
const clean = (t) => wordsForCodes(stripEvidenceIds(t));
const safeRoute = (r) => (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : null);

/** Which path produced the text. Always shown (I-03 fallback label). */
export function AiPathLabel({ result }) {
  if (!result) return null;
  const ai = result.provider && result.provider !== 'heuristic';
  return (
    <span className="aipath">
      <Badge tone={ai ? 'gold' : 'outline'} size="sm">{ai ? 'AI-drafted' : 'Rules-based'}</Badge>
      {result.notice && <span className="ui-faint aipath-notice">{result.notice}</span>}
    </span>
  );
}

/**
 * 402 (D32): the gate is shown in place, calm, with at most one link to the plans page.
 * `message` is a gateFor() reading (lib/plan.js) or a plain string.
 */
export function UpgradeNote({ message }) {
  const g = message && typeof message === 'object' ? message : { message, href: upgradeHref(), cta: 'See plans' };
  return (
    <p className="ui-muted aigate"><Icon name={g.href ? 'lock' : 'info'} /> {g.message || 'This is part of a paid plan.'}{g.href && <> <Link to={g.href}>{g.cta || 'See plans'}</Link></>}</p>
  );
}

export function NextStep({ step }) {
  if (!step?.label) return null;
  const to = safeRoute(step.route);
  return <p className="ainext">Next: {to ? <Link to={to}>{step.label}</Link> : step.label}{step.why ? <span className="ui-faint"> · {clean(step.why)}</span> : null}</p>;
}

export function Cite({ c }) {
  const date = c.as_of ? fmtDate(c.as_of) : null;
  const label = stealthLabel(c.provenance) || 'Unknown';
  const value = Array.isArray(c.value) ? c.value.join(', ') : c.value;
  const tip = [c.field && `${c.field}: ${wordsForCodes(String(value ?? 'not on record'))}`, label, date && `checked ${date}`, c.source_name].filter(Boolean).join(' · ');
  return (
    <span className={`cite${c.verified ? ' is-verified' : ''}`} title={tip} tabIndex={0} aria-label={`Source: ${tip}`}>
      <span className="cite-f">{c.field || 'field'}</span>
      <span className="cite-p">{label}{date ? ` · ${date}` : ''}</span>
    </span>
  );
}

function TaskShell({ s, children }) {
  if (s.loading) return <Skeleton variant="text" lines={4} />;
  if (s.gate) return <UpgradeNote message={s.gate} />;
  if (s.error) return <Alert tone="bad">{s.error}</Alert>;
  return s.result ? <div className="aiblock">{children}</div> : null;
}

/** match_compare: AI summary for the compare view. The engine's order is kept. */
export function CompareSummary({ companyId, runId, recordIds }) {
  const [s, run] = useTask('match_compare');
  const o = s.result?.output;
  const names = new Map((o?.investors || []).map((i) => [i.record_id, i.name]));
  return (
    <section className="aisec" aria-label="AI comparison">
      {!s.result && !s.loading && !s.gate && (
        <Button variant="secondary" size="sm" iconLeft="spark" onClick={() => run({ company_id: companyId, run_id: runId, record_ids: recordIds })}>Summarise this comparison</Button>
      )}
      <TaskShell s={s}>
        <div className="aiblock-top"><AiPathLabel result={s.result} /></div>
        {o?.summary && <p>{clean(o.summary)}</p>}
        {(o?.per_investor || []).length > 0 && (
          <ul className="ailist">{o.per_investor.map((p) => <li key={p.record_id}><strong>{p.name || names.get(p.record_id)}</strong>: {clean(p.choose_if)}</li>)}</ul>
        )}
        {(o?.key_differences || []).length > 0 && (
          <>
            <h4 className="sub-h">Key differences</h4>
            <ul className="ailist">{o.key_differences.map((k, i) => <li key={i}>{clean(k.note || k.text || '')}</li>)}</ul>
          </>
        )}
        {o?.order_basis && <p className="ui-faint">{o.order_basis}</p>}
        <NextStep step={o?.next_step} />
      </TaskShell>
    </section>
  );
}

/** shortlist_summary: what the saved list says, with the engine's counts. */
export function ShortlistSummary({ companyId, recordIds }) {
  const [s, run] = useTask('shortlist_summary');
  const o = s.result?.output;
  return (
    <section className="aisec aisec-card" aria-label="Shortlist summary">
      <div className="aisec-head">
        <div>
          <h2 className="aisec-h">Your shortlist at a glance</h2>
          <p className="ui-muted">A summary of the providers you saved, built from the match engine's counts and the source of each fact.</p>
        </div>
        {!s.result && !s.loading && !s.gate && (
          <Button variant="secondary" size="sm" iconLeft="spark" onClick={() => run({ company_id: companyId, record_ids: recordIds.slice(0, 15) })}>Summarise my shortlist</Button>
        )}
      </div>
      <TaskShell s={s}>
        <div className="aiblock-top"><AiPathLabel result={s.result} /></div>
        {o?.summary && <p>{clean(o.summary)}</p>}
        {(o?.takeaways || []).length > 0 && <ul className="ailist">{o.takeaways.map((t, i) => <li key={i}>{clean(t)}</li>)}</ul>}
        {(o?.start_with || []).length > 0 && (
          <p className="ainote"><strong>Start with:</strong> {o.start_with.slice(0, 3).map((x, i) => <span key={x.record_id}>{i ? ', ' : ''}<Link to={`/capital/matches/${encodeURIComponent(x.record_id)}`}>{x.name}</Link></span>)}</p>
        )}
        {(o?.research_first || []).length > 0 && (
          <p className="ainote"><strong>Check first:</strong> {o.research_first.slice(0, 3).map((x) => x.name || x.record_id).join(', ')}</p>
        )}
        <NextStep step={o?.next_step} />
        {o?.note && <p className="ui-faint">{o.note}</p>}
      </TaskShell>
    </section>
  );
}

const textOf = (x) => (typeof x === 'string' ? x : x?.question || x?.statement || x?.point || x?.text || x?.label || '');

/** meeting_prep: notes for the founder before a call. Nothing is sent. */
export function MeetingPrep({ companyId, runId, recordId, compact = false }) {
  const [s, run] = useTask('meeting_prep');
  const o = s.result?.output;
  const sec = (title, items, render = (x) => clean(textOf(x))) => (items || []).length > 0 && (
    <>
      <h4 className="sub-h">{title}</h4>
      <ul className="ailist">{items.map((x, i) => <li key={i}>{render(x)}</li>)}</ul>
    </>
  );
  return (
    <section className={`aisec${compact ? ' is-compact' : ''}`} aria-label="Prepare for the call">
      {!s.result && !s.loading && !s.gate && (
        <Button variant="secondary" size="sm" iconLeft="spark" onClick={() => run({ company_id: companyId, run_id: runId || undefined, record_id: recordId })}>Prepare for the call</Button>
      )}
      <TaskShell s={s}>
        <div className="aiblock-top"><AiPathLabel result={s.result} /></div>
        {o?.opening && <p>{clean(o.opening)}</p>}
        {sec('What we know', o?.what_we_know, (x) => (
          <>{clean(textOf(x))}{x.provenance && <span className="cites"><Cite c={{ field: x.dimension, value: x.value, provenance: x.provenance.label_text || x.provenance.label, verified: x.provenance.verified, as_of: x.provenance.as_of, source_name: x.provenance.source_name }} /></span>}</>
        ))}
        {sec('Not on record', o?.unknowns)}
        {sec('Questions to ask', o?.questions_to_ask, (x) => <>{clean(textOf(x))}{x.why ? <span className="ui-faint"> · {clean(x.why)}</span> : null}</>)}
        {sec('Questions to expect', o?.questions_to_expect, (x) => <>{clean(textOf(x))}{x.why ? <span className="ui-faint"> · {clean(x.why)}</span> : null}</>)}
        {sec('Talking points', o?.talking_points)}
        {sec('Bring', o?.bring)}
        {sec('Watch outs', o?.watch_outs)}
        {o?.note && <p className="ui-faint">{o.note}</p>}
      </TaskShell>
    </section>
  );
}
