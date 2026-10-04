import { Link, useParams } from 'react-router-dom';
import { Badge, Card, PageHeader, SkeletonCards, Table } from '../../design/ui';
import useApi from '../../lib/useApi';
import { BUCKET_LABEL, EVIDENCE_LABEL, EVIDENCE_TONE, PROVIDER_ISSUE_LABEL, STAGE_LABEL, TIER_LABEL, getProvider360 } from '../../lib/admin';
import { AdminLoadError, Flags, KV } from './adminBits';
import { ago, day, fmtUsd, words } from '../../lib/adminFormat';

const FIELD_LABEL = {
  investor_types: 'Investor type', stages: 'Stages', sectors: 'Sectors', sector_exclusions: 'Sector exclusions',
  business_models: 'Business models', instruments: 'Instruments', ticket: 'Ticket', lead_preference: 'Lead preference',
  equity_taken_pct: 'Equity taken', accepts_hq: 'Accepts companies from', target_markets: 'Target markets',
  requires_local_presence: 'Requires local presence', revenue_requirement: 'Revenue requirement', min_revenue_usd: 'Minimum revenue',
  founder_requirements: 'Founder requirements', application_open: 'Applications open', deadline: 'Deadline', next_intake: 'Next intake',
  contact_route: 'Contact route',
};

function show(field, v) {
  if (v === null || v === undefined) return null;
  if (field === 'ticket') {
    const { min_usd: a, max_usd: b, typical_usd: t } = v;
    if (a == null && b == null && t == null) return null;
    return `${a != null ? fmtUsd(a) : '?'} – ${b != null ? fmtUsd(b) : '?'}${t != null ? ` (typical ${fmtUsd(t)})` : ''}`;
  }
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (field === 'deadline' || field === 'next_intake') return day(v);
  if (field === 'min_revenue_usd') return fmtUsd(Number(v));
  if (field === 'equity_taken_pct') return `${v}%`;
  return String(v);
}

/**
 * Admin · Provider 360. One capital provider: who it is, its mandate field by
 * field with the evidence behind each value, how fresh that evidence is, which
 * companies it is matched to and what happened. Verified, Sourced, Inferred
 * and Missing stay separate: a missing field shows no value, ever.
 * Read-only: corrections go through the research pipeline.
 */
export default function AdminProviderPage() {
  const { recordId } = useParams();
  const q = useApi(() => getProvider360(recordId), [recordId]);
  const d = q.data;

  if (q.error) return (<div><PageHeader eyebrow="Provider 360" title="Provider" /><AdminLoadError error={q.error} what="This provider" /></div>);
  if (!d) return (<div><PageHeader eyebrow="Provider 360" title="Loading…" /><SkeletonCards count={4} /></div>);

  const { provider: pv, evidence: ev, evidence_summary: sum, matching: m, outcomes: o, data_quality: dq } = d;
  const total = sum.verified + sum.sourced + sum.inferred + sum.missing;

  return (
    <div className="admin-360">
      <PageHeader
        eyebrow={<Link to="/admin/providers">Capital providers</Link>}
        title={pv.name}
        subtitle={[pv.type, pv.city, pv.country, pv.record_id].filter(Boolean).join(' · ')}
      />
      <div className="admin-360-flags ui-row">
        <Badge tone={pv.status === 'Active' ? 'ok' : 'bad'}>{pv.status || 'Status unknown'}</Badge>
        <Flags items={dq.issues} label={PROVIDER_ISSUE_LABEL} urgent={new Set(['unverified', 'stale', 'deadline_passed'])} none="No data issues." />
      </div>

      {/* How well evidenced the mandate is, before anyone relies on it. */}
      <div className="admin-evidence-bar" role="img" aria-label={`${sum.verified} verified, ${sum.sourced} sourced, ${sum.inferred} inferred, ${sum.missing} missing of ${total} mandate fields`}>
        {['verified', 'sourced', 'inferred', 'missing'].map((k) => sum[k] > 0 && (
          <span key={k} className={`is-${k}`} style={{ flexGrow: sum[k] }}>{EVIDENCE_LABEL[k]} {sum[k]}</span>
        ))}
      </div>

      <div className="ui-grid ui-grid-3 admin-360-grid">
        <Card title="Identity">
          <KV rows={[
            ['Type', pv.type], ['Based', [pv.city, pv.country].filter(Boolean).join(', ') || null],
            ['Website', pv.website ? <a href={pv.website} target="_blank" rel="noreferrer noopener">{pv.website.replace(/^https?:\/\//, '')}</a> : null],
            ['Parent', pv.parent_org], ['Regulator', pv.legal_regulator], ['Also known as', pv.aka],
          ]} />
        </Card>
        <Card title="Verification and freshness">
          <KV rows={[
            ['Level', ev.verification_level, 'None'],
            ['Verified', ev.verified_date ? day(ev.verified_date) : null, 'Never'],
            ['Freshness', ev.freshness_days != null ? <span>{ev.freshness_days} day{ev.freshness_days === 1 ? '' : 's'} {ev.stale && <Badge tone="bad" size="sm">Stale</Badge>}</span> : null, 'Unknown (treated as stale)'],
            ['Last activity', ev.last_activity_date ? day(ev.last_activity_date) : null],
            ['Confidence', ev.confidence.band ? `${ev.confidence.band}${ev.confidence.score != null ? ` · ${ev.confidence.score}` : ''}` : null],
            ['Completeness', ev.confidence.completeness != null ? `${Math.round(ev.confidence.completeness)}%` : null],
          ]} />
          {ev.evidence_urls.length > 0 && (
            <p className="admin-note admin-small">Evidence: {ev.evidence_urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer noopener">{i ? ', ' : ''}source {i + 1}</a>)}</p>
          )}
        </Card>
        <Card title="Outcomes">
          <KV rows={[
            ['Matched to', `${m.companies} compan${m.companies === 1 ? 'y' : 'ies'} (latest runs)`],
            ['In pipelines', Object.entries(o.pipeline_by_stage).map(([k, v]) => `${v} ${(STAGE_LABEL[k] || k).toLowerCase()}`).join(' · ') || null, 'None'],
            ['Outcome events', Object.entries(o.events).map(([k, v]) => `${v} ${words(k).toLowerCase()}`).join(' · ') || null, 'None'],
            ['Founder feedback', o.feedback.up || o.feedback.down ? `${o.feedback.up} up · ${o.feedback.down} down` : null, 'None'],
            ['Why marked wrong', Object.entries(o.feedback.down_reasons).map(([k, v]) => `${words(k)} (${v})`).join(', ') || null, '—'],
            ['Pending corrections', dq.corrections.pending],
          ]} />
        </Card>
      </div>

      <Card title="Mandate, field by field" subtitle="The label is how we know it. Missing shows nothing: it is never filled in." className="admin-360-section">
        <Table
          dense
          rowKey="key"
          columns={[
            { key: 'field', header: 'Field' },
            { key: 'value', header: 'Value' },
            { key: 'evidence', header: 'Evidence' },
            { key: 'source', header: 'Source' },
          ]}
          rows={d.mandate.map((f) => ({
            key: f.field,
            field: FIELD_LABEL[f.field] || words(f.field),
            value: f.evidence === 'missing' ? <span className="ui-faint">—</span> : (show(f.field, f.value) ?? <span className="ui-faint">—</span>),
            evidence: <Badge tone={EVIDENCE_TONE[f.evidence]} size="sm">{EVIDENCE_LABEL[f.evidence]}</Badge>,
            source: <span className="admin-small ui-muted">{f.evidence === 'missing' ? 'No value on record' : [f.label_text, f.source_name, f.as_of && day(f.as_of)].filter(Boolean).join(' · ')}</span>,
          }))}
        />
      </Card>

      <Card title="Companies it is matched to" subtitle="Each company's latest run only" className="admin-360-section">
        {m.items.length === 0 ? <p className="ui-muted">Not in any company's latest match run.</p> : (
          <Table
            dense
            rowKey="key"
            columns={[
              { key: 'company', header: 'Company' },
              { key: 'rank', header: 'Rank', numeric: true },
              { key: 'bucket', header: 'Eligibility' },
              { key: 'tier', header: 'Fit' },
              { key: 'score', header: 'Score', numeric: true },
              { key: 'at', header: 'Run' },
            ]}
            rows={m.items.map((x) => ({
              key: x.company_id,
              company: <Link to={`/admin/companies/${x.company_id}`}>{x.company_name || 'Unnamed company'}</Link>,
              rank: x.rank, score: x.match_score ?? '—',
              bucket: x.bucket ? BUCKET_LABEL[x.bucket] : <span className="ui-faint">Not stored</span>,
              tier: x.fit_tier ? TIER_LABEL[x.fit_tier] : <span className="ui-faint">Not stored</span>,
              at: <span className="admin-small">{ago(x.run_at)}</span>,
            }))}
          />
        )}
      </Card>

      {dq.corrections.recent.length > 0 && (
        <Card title="Correction history" subtitle={dq.note} className="admin-360-section">
          <ul className="admin-list">
            {dq.corrections.recent.map((x, i) => (
              <li key={`${x.field}-${i}`}><span>{FIELD_LABEL[x.field] || words(x.field)}</span><span className="ui-row"><Badge size="sm" tone={x.status === 'pending' ? 'warn' : 'neutral'}>{words(x.status)}</Badge><span className="ui-faint admin-small">{ago(x.created_at)}</span></span></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
