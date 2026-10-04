import { Link, useParams } from 'react-router-dom';
import { Badge, Card, PageHeader, SkeletonCards, Table } from '../../design/ui';
import useApi from '../../lib/useApi';
import { BUCKET_LABEL, COMPANY_FLAG_LABEL, STAGE_LABEL, TIER_LABEL, URGENT_COMPANY_FLAGS, getCompany360 } from '../../lib/admin';
import { AdminLoadError, Flags, KV } from './adminBits';
import { ago, day, fmtUsd, words } from '../../lib/adminFormat';

const FIT_TONE = { strong: 'ok', possible: 'info', lead: 'neutral', unlikely: 'neutral' };
const STATE_WORD = { burning: 'Burning', break_even: 'Break-even', profitable: 'Profitable', dormant: 'Dormant' };
const TIMING_WORD = { now: 'Now', '0_3m': 'Within 3 months', '3_6m': 'In 3–6 months', '6_12m': 'In 6–12 months', exploring: 'Exploring' };

// The log, one row per staff member (newest first): who has been looking matters more than each click.
function groupAccess(rows) {
  const m = new Map();
  for (const a of rows) {
    const who = a.actor_email || 'Unknown staff';
    const g = m.get(who) || { who, n: 0, last: a.at };
    g.n += 1;
    if (a.at > g.last) g.last = a.at;
    m.set(who, g);
  }
  return [...m.values()];
}

// One station on the journey strip: where this company is, and whether it is stuck there.
function Station({ label, value, sub, state = 'idle', href }) {
  const body = (
    <>
      <span className="admin-station-label">{label}</span>
      <span className="admin-station-value">{value}</span>
      {sub && <span className="admin-station-sub">{sub}</span>}
    </>
  );
  return <li className={`admin-station is-${state}`}>{href ? <a href={href}>{body}</a> : body}</li>;
}

/**
 * Admin · Company 360. One company's whole state, from Company Intelligence to
 * outcomes, for staff OVERSIGHT. Not impersonation: counts, states and dates,
 * never the founder's documents, drafts or notes. The server audits every
 * opening (who, when, request id) and refuses the view if it cannot.
 */
export default function AdminCompanyPage() {
  const { id } = useParams();
  const q = useApi(() => getCompany360(id), [id]);
  const d = q.data;

  if (q.error) return (<div><PageHeader eyebrow="Company 360" title="Company" /><AdminLoadError error={q.error} what="This company" /></div>);
  if (!d) return (<div><PageHeader eyebrow="Company 360" title="Loading…" /><SkeletonCards count={4} /></div>);

  const { company: c, intelligence: ci, readiness: rd, capital_need: need, routes, matching: m, pipeline: p, outcomes: o } = d;
  const fh = ci.financial_health;
  const rec = ci.company_record;
  const funded = (o.by_event.funded || 0) + (p.by_stage.closed_won || 0);
  const contacted = ['contacted', 'in_conversation', 'diligence', 'term_sheet', 'closed_won'].reduce((s, k) => s + (p.by_stage[k] || 0), 0);

  return (
    <div className="admin-360">
      <PageHeader
        eyebrow={<Link to="/admin/companies">Companies</Link>}
        title={c.name}
        subtitle={[c.stage, c.sector, c.country, c.owner.email].filter(Boolean).join(' · ') || 'No profile details yet'}
      />

      <div className="admin-360-flags">
        <Flags items={d.flags} label={COMPANY_FLAG_LABEL} urgent={URGENT_COMPANY_FLAGS} none="Nothing needs attention." />
      </div>

      {/* The journey, left to right, with where it is stuck. */}
      <ol className="admin-journey" aria-label="Capital journey">
        <Station label="Financial Health" value={fh.status === 'not_computed' ? 'Not computed' : fh.score != null ? `${Math.round(fh.score)} · ${fh.band}` : words(fh.status)}
          sub={fh.state ? STATE_WORD[fh.state] : null} state={fh.status === 'not_computed' ? 'missing' : ['Critical', 'Warning'].includes(fh.band) ? 'bad' : 'ok'} />
        <Station label="Capital Readiness" value={rd.paid ? `${Math.round(rd.paid.score)} · ${rd.paid.band || ''}` : 'Not assessed'}
          sub={rd.paid ? day(rd.paid.assessed_at) : null} state={rd.paid ? 'ok' : 'missing'} />
        <Station label="Company Record" value={rec.status === 'not_computed' ? 'Not computed' : `${Math.round(rec.pct ?? 0)}%`}
          sub={rec.status === 'not_computed' ? null : `${rec.missing_count} missing`} state={rec.status === 'not_computed' ? 'missing' : rec.missing_count ? 'warn' : 'ok'} />
        <Station label="Capital need" value={need.raise_usd ? fmtUsd(need.raise_usd) : 'Not set'}
          sub={need.confirmed ? 'Confirmed' : 'Not confirmed'} state={need.confirmed ? 'ok' : 'missing'} />
        <Station label="Routes" value={routes ? `${routes.counts.strong} strong · ${routes.counts.possible} possible` : 'Unavailable'}
          sub={routes?.start_here_label ? `Start: ${routes.start_here_label}` : null} state={routes?.counts?.usable ? 'ok' : 'missing'} />
        <Station label="Matches" value={m.latest ? `${m.latest.buckets.eligible ?? '—'} eligible` : 'Never run'}
          sub={m.latest ? ago(m.latest.created_at) : null} state={m.latest ? 'ok' : need.confirmed ? 'bad' : 'missing'} />
        <Station label="Shortlist" value={`${p.total}`} sub={p.idle ? `${p.idle} idle` : null} state={p.idle ? 'bad' : p.total ? 'ok' : m.latest ? 'warn' : 'missing'} />
        <Station label="Outreach" value={`${contacted} contacted`} sub={`${p.by_stage.in_conversation + p.by_stage.diligence + p.by_stage.term_sheet} in play`} state={contacted ? 'ok' : p.total ? 'warn' : 'missing'} />
        <Station label="Deal room" value="Not live" sub={`${d.deal_room.data_room.total} data-room items`} state="idle" />
        <Station label="Outcome" value={funded ? `${funded} funded` : (p.by_stage.passed || 0) ? `${p.by_stage.passed} passed` : 'None yet'} state={funded ? 'ok' : 'idle'} />
      </ol>

      <div className="ui-grid ui-grid-3 admin-360-grid">
        <Card title="Financial Health" subtitle={fh.methodology_version ? `${fh.methodology} · ${fh.methodology_version}` : fh.methodology}>
          {fh.status === 'not_computed'
            ? <p className="ui-muted">{ci.available ? 'No figures have produced a result yet.' : ci.note}</p>
            : <KV rows={[
              ['Score', fh.score != null ? `${Math.round(fh.score)} · ${fh.band}` : null, words(fh.status)],
              ['State', fh.state ? STATE_WORD[fh.state] : null],
              fh.state === 'burning' ? ['Runway', fh.runway_months != null ? `${Math.round(fh.runway_months * 10) / 10} months` : null] : ['Cash buffer', fh.cash_buffer_months != null ? `${Math.round(fh.cash_buffer_months * 10) / 10} months` : null],
              ['Source', fh.source_label],
              ['Computed', day(fh.computed_at)],
              ['Last check-in', ci.last_checkin_at ? `${day(ci.last_checkin_at)} · ${ci.months_with_figures} months` : null, 'Never'],
            ]} />}
        </Card>

        <Card title="Capital Readiness" subtitle="Paid assessment (conncct-14) only">
          {rd.paid
            ? <KV rows={[['Score', `${Math.round(rd.paid.score)} · ${rd.paid.band || ''}`], ['Assessed', day(rd.paid.assessed_at)]]} />
            : <p className="ui-muted">Not assessed. A free onboarding score is not Capital Readiness and is never shown as one.</p>}
          {rd.onboarding && (
            <p className="ui-faint admin-note">Onboarding readiness {Math.round(rd.onboarding.score)} · {rd.onboarding.band} (context only, {day(rd.onboarding.assessed_at)}).</p>
          )}
        </Card>

        <Card title="Company Record" subtitle={rec.methodology}>
          {rec.status === 'not_computed'
            ? <p className="ui-muted">Not computed yet.</p>
            : <KV rows={[
              ['Complete', rec.pct != null ? `${Math.round(rec.pct)}%` : null],
              ['Verified', rec.verified_pct != null ? `${Math.round(rec.verified_pct)}%` : null],
              ['Missing', rec.missing_count], ['Expiring', rec.expiring_count], ['Critical gaps', rec.open_critical_count],
              ['Computed', day(rec.computed_at)],
            ]} />}
        </Card>

        <Card title="Capital need" subtitle={need.raising ? 'Raising' : 'Not raising'}>
          <KV rows={[
            ['Amount', need.raise_usd ? fmtUsd(need.raise_usd) : null, 'Not set'],
            ['Instrument', need.instrument],
            ['Timing', need.raise_timing ? TIMING_WORD[need.raise_timing] || need.raise_timing : null],
            ['Target date', need.target_funding_date ? day(need.target_funding_date) : null, 'None given'],
            ['Start raising by', need.timing?.start_by ? `${day(need.timing.start_by)}, bound by ${need.timing.bound_by === 'runway' ? 'runway' : 'target date'}` : null, need.timing?.status === 'no_target_date' ? 'Needs a target date' : '—'],
            ['Raised to date', need.raised_to_date_usd != null ? fmtUsd(need.raised_to_date_usd) : null],
            ['Confirmed', need.confirmed ? day(need.confirmed_at) : null, 'Not confirmed'],
          ]} />
          {need.timing?.attention && <p className="admin-note"><Badge tone="warn">{words(need.timing.attention.code)}</Badge></p>}
        </Card>

        <Card title="Routes" subtitle={routes ? `Routing ${routes.engine_version}` : 'Routing unavailable'}>
          {!routes ? <p className="ui-muted">Routing could not run for this company.</p> : (
            <>
              <ul className="admin-list">
                {routes.top.map((r) => (
                  <li key={r.key}>
                    <span>{r.label}{r.start_here && <Badge tone="gold" size="sm">Start here</Badge>}</span>
                    <span className="ui-row">
                      {r.fit_reason_code && <span className="ui-faint admin-small">{words(r.fit_reason_code)}</span>}
                      <Badge tone={FIT_TONE[r.fit]} size="sm">{words(r.fit)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
              {routes.financial_state_used && <p className="ui-faint admin-note">Financial state used: {STATE_WORD[routes.financial_state_used.value] || '—'} ({routes.financial_state_used.source}).</p>}
              {routes.unknown_fields.length > 0 && <p className="ui-faint admin-note">Unknown: {routes.unknown_fields.map(words).join(', ')}.</p>}
            </>
          )}
        </Card>

        <Card title="Activity and outcomes" subtitle="Counts only: draft and note text stay the founder's">
          <KV rows={[
            ['Outreach drafts', Object.entries(d.outreach.by_status).map(([k, v]) => `${v} ${words(k).toLowerCase()}`).join(' · ') || null, 'None'],
            ['Meetings · calls', `${d.activity.meetings} · ${d.activity.calls}`],
            ['Follow-ups', `${d.activity.open_follow_ups} open${d.activity.overdue_follow_ups ? ` · ${d.activity.overdue_follow_ups} overdue` : ''}`],
            ['Data room', d.deal_room.data_room.total ? Object.entries(d.deal_room.data_room.by_status).map(([k, v]) => `${v} ${k}`).join(' · ') : null, 'Empty'],
            ['Outcomes', Object.entries(o.by_event).map(([k, v]) => `${v} ${words(k).toLowerCase()}`).join(' · ') || null, 'None recorded'],
            ['Match feedback', o.feedback.up || o.feedback.down ? `${o.feedback.up} up · ${o.feedback.down} down` : null, 'None'],
          ]} />
        </Card>
      </div>

      <Card
        title="Matches"
        subtitle={m.latest
          ? `Latest of ${m.runs_total} run${m.runs_total === 1 ? '' : 's'} · ${day(m.latest.created_at)} · ${m.latest.provider}${m.latest.ai_model ? ` (${m.latest.ai_model})` : ''} · ${m.latest.engine_version || m.latest.engine_version_note}`
          : 'Never matched'}
        className="admin-360-section"
        action={<Link to={`/admin/matching`}>Matching oversight</Link>}
      >
        {m.latest && (
          <p className="ui-faint admin-note">
            {m.latest.considered ?? '—'} considered · {m.latest.returned ?? '—'} returned · {m.latest.buckets.eligible ?? '—'} verified eligible · {m.latest.buckets.possible ?? '—'} possible · {m.latest.buckets.likely_outside ?? '—'} likely outside
            {m.latest.ai_failed && <> · <Badge tone="bad" size="sm">AI step failed</Badge></>}
          </p>
        )}
        {m.top.length > 0 && (
          <Table
            dense
            rowKey="key"
            columns={[
              { key: 'rank', header: '#', numeric: true },
              { key: 'provider', header: 'Provider' },
              { key: 'bucket', header: 'Eligibility' },
              { key: 'tier', header: 'Fit' },
              { key: 'score', header: 'Score', numeric: true },
              { key: 'conf', header: 'Data' },
            ]}
            rows={m.top.map((r) => ({
              key: r.record_id,
              rank: r.rank,
              provider: (
                <span>
                  <Link to={`/admin/providers/${encodeURIComponent(r.record_id)}`}>{r.name || r.record_id}</Link>
                  {r.provider_status && r.provider_status !== 'Active' && <> <Badge tone="bad" size="sm">{r.provider_status}</Badge></>}
                </span>
              ),
              bucket: r.bucket ? BUCKET_LABEL[r.bucket] : <span className="ui-faint">Not stored</span>,
              tier: r.fit_tier ? TIER_LABEL[r.fit_tier] : <span className="ui-faint">Not stored</span>,
              score: r.match_score ?? '—',
              conf: <span className="admin-small">{r.confidence || '—'}{r.unknown_count ? ` · ${r.unknown_count} unknown` : ''}</span>,
            }))}
          />
        )}
      </Card>

      <Card title="Shortlist and pipeline" subtitle={`${p.total} provider${p.total === 1 ? '' : 's'} · idle after ${p.idle_after_days} days in an active stage`} className="admin-360-section">
        {p.items.length === 0 ? <p className="ui-muted">Nothing shortlisted.</p> : (
          <Table
            dense
            rowKey="key"
            columns={[
              { key: 'provider', header: 'Provider' },
              { key: 'stage', header: 'Stage' },
              { key: 'since', header: 'In stage' },
              { key: 'fit', header: 'Fit when added' },
              { key: 'next', header: 'Next action' },
            ]}
            rows={p.items.map((x) => ({
              key: x.record_id,
              provider: <Link to={`/admin/providers/${encodeURIComponent(x.record_id)}`}>{x.name || x.record_id}</Link>,
              stage: STAGE_LABEL[x.stage] || x.stage,
              since: x.idle ? <Badge tone="bad" size="sm">{x.days_in_stage} days</Badge> : <span className="admin-small">{x.days_in_stage ?? '—'} days</span>,
              fit: x.fit_tier_at_add ? TIER_LABEL[x.fit_tier_at_add] : '—',
              next: x.next_action_date ? (x.next_action_overdue ? <Badge tone="warn" size="sm">Overdue {day(x.next_action_date)}</Badge> : day(x.next_action_date)) : '—',
            }))}
          />
        )}
      </Card>

      <div className="ui-grid ui-grid-2 admin-360-section">
        <Card title="Recent product activity" subtitle="Journey events: names and screens only">
          {d.recent_activity.length === 0 ? <p className="ui-muted">No recorded activity.</p> : (
            <ul className="admin-list">
              {d.recent_activity.map((e, i) => <li key={`${e.event}-${i}`}><span>{e.event}</span><span className="ui-faint admin-small">{ago(e.at)}</span></li>)}
            </ul>
          )}
        </Card>
        <Card title="Staff access" subtitle="Every opening is logged · grouped from the last 50">
          {d.access_log.length === 0 ? <p className="ui-muted">No staff access recorded.</p> : (
            <ul className="admin-list">
              {groupAccess(d.access_log).map((g) => (
                <li key={g.who}><span>{g.who}</span><span className="ui-faint admin-small">{g.n} view{g.n === 1 ? '' : 's'} · last {ago(g.last)}</span></li>
              ))}
            </ul>
          )}
          <p className="ui-faint admin-note">{d.boundaries.note}</p>
        </Card>
      </div>
    </div>
  );
}
