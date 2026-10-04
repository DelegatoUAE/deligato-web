import { Link } from 'react-router-dom';
import { Badge, Button, Icon, Skeleton } from '../design/ui';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getCommandCenter, isUnavailable } from '../lib/companyIntel';
import { firstName, countryName, fmtUsd, fmtDate, fmtMonths, timingLabel, plural, plainIntel, todayIso, companyWord } from '../lib/format';
import { partOfDay } from '../lib/home';
import { LoadError, FundraisingNotice } from '../components/capital/bits';
import ClassicHome, { Waiting } from '../components/home/ClassicHome';
import { ChangeList, AttentionList, AskPrompts, SpecialistLink, Delta, UpgradeLine } from '../components/intel/IntelBits';

/**
 * Home: the Company Command Center (D58, client-portal.md). One read,
 * GET /company-intel/:id/command-center. The founder answers six questions in
 * seconds: how is my company doing, what changed, what needs attention, what
 * next, am I ready for capital, what is happening with my raise.
 * Signals sit side by side, each with its own method, date and source:
 * there is no combined score (D40). Prominence follows the API's order.
 */
export default function DashboardPage() {
  const { me, staff, company, companyId, companiesLoading, dataRoom } = useCompany();
  const q = useApi(() => (companyId ? getCommandCenter(companyId) : null), [companyId]);
  const name = firstName(me?.profile?.full_name || me?.user?.user_metadata?.full_name);

  if (companiesLoading) return <CcSkeleton />;
  if (!company) return <Waiting staff={staff} name={name} />;
  // Before migration 016 the live layer answers 503: keep the previous Home rather than a blank page.
  if (q.error && isUnavailable(q.error)) return <ClassicHome />;
  if (q.error) return <div className="cc"><Greeting name={name} company={company} /><LoadError error={q.error} onRetry={q.reload} what="your Command Center" /></div>;
  if (!q.data) return <CcSkeleton />;

  const cc = q.data;
  const order = cc.prominence?.order || ['financial_health', 'company_record', 'capital_readiness', 'capital_need'];
  const emphasis = cc.prominence?.emphasis || {};
  const raise = cc.raise;
  const showRoom = Boolean(raise) || ['now', '0_3m', '3_6m'].includes(cc.signals?.capital_need?.raise_timing);

  return (
    <div className="cc">
      <Greeting name={name} company={company} snapshot={cc.snapshot} />

      <NextBlock next={cc.next} />

      <section aria-label={`Your ${companyWord(company)}'s signals`} className="cc-signals">
        <h2 className="cc-h">Where you stand <span className="cc-h-note">Each signal is measured on its own. There is no combined score.</span></h2>
        <div className="sig-grid">
          {order.filter((k) => k !== 'raise').map((k) => <Signal key={k} kind={k} s={cc.signals?.[k]} high={emphasis[k] === 'high'} />)}
        </div>
      </section>

      {raise && <RaiseStrip raise={raise} />}

      <div className="cc-two">
        <section aria-labelledby="cc-changed">
          <h2 id="cc-changed" className="cc-h">What changed</h2>
          <ChangeList items={dedupe(cc.what_changed, cc.attention)} limit={5} empty="Nothing material has changed recently. Your monthly check-in is the main source of change." />
          {cc.what_changed_scope === 'last_change_only' && <UpgradeLine note="Your plan shows your last Financial Health change. Company Intelligence follows your record, readiness, matches and pipeline too." />}
          {cc.what_changed?.length > 0 && <Link to="/company/intelligence" className="cc-more">All changes and attention →</Link>}
        </section>
        <section aria-labelledby="cc-attn">
          <h2 id="cc-attn" className="cc-h">Needs attention</h2>
          <AttentionList items={(cc.attention || []).slice(0, 4)} />
        </section>
      </div>

      {showRoom && <DealRoomLine dataRoom={dataRoom} />}

      <AskPrompts prompts={cc.ask_ai?.prompts} title={`Ask about your ${companyWord(company)}`} />
      <FundraisingNotice />
    </div>
  );
}

/** An item already in "Needs attention" (the reassessment) is not repeated under "What changed". */
function dedupe(changed, attention) {
  const reas = (attention || []).some((a) => a.code === 'T6');
  return (changed || []).filter((c) => !(reas && c.type === 'reassessment_recommended'));
}

function CcSkeleton() {
  return (
    <div className="cc" aria-busy="true" aria-label="Loading your Command Center">
      <Skeleton w="50%" h="34px" /><Skeleton w="30%" h="14px" />
      <Skeleton h="150px" r="16px" />
      <div className="sig-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="150px" r="12px" />)}</div>
    </div>
  );
}

function Greeting({ name, company, snapshot }) {
  const co = snapshot?.company || company;
  const persona = snapshot?.persona?.name;
  const goal = snapshot?.goal?.name;
  return (
    <header className="cc-head">
      <p className="cc-eyebrow">{`Good ${partOfDay()}${name ? `, ${name}` : ''}`}</p>
      <h1>{co.name}</h1>
      <p className="cc-sub">{[co.stage, co.sector, countryName(co.hq_country_iso2 || company?.hq_country_iso2)].filter(Boolean).join(' · ')}</p>
      {(persona || goal) && (
        <p className="cc-tags">
          {goal && <span className="cc-tag"><span>Goal</span> {goal}</span>}
          {persona && <span className="cc-tag"><span>Persona</span> {persona}</span>}
        </p>
      )}
    </header>
  );
}

/** "The most important thing to do next is…" + up to three priorities (shared NBA rules, not generic AI). */
function NextBlock({ next }) {
  const top = next?.top;
  const internal = (r) => typeof r === 'string' && r.startsWith('/');
  if (!top) {
    return (
      <section className="nextb nextb-calm" aria-label="Next best action">
        <p className="nextb-kicker">You're up to date</p>
        <p className="nextb-title">Nothing urgent. Your next monthly check-in keeps this picture current.</p>
        <Button as={Link} to="/company/check-in" variant="secondary">Open check-in</Button>
      </section>
    );
  }
  return (
    <section className="nextb" aria-labelledby="nextb-t">
      <p className="nextb-kicker">The most important thing to do next is</p>
      <h2 id="nextb-t" className="nextb-title">{top.label}</h2>
      {top.why && <p className="nextb-why">{plainIntel(top.why)}</p>}
      {internal(top.route) && <Button as={Link} to={top.route} variant="accent" iconRight="send" className="nextb-cta">{top.label}</Button>}
      {(next.priorities || []).length > 0 && (
        <ol className="prio">
          {next.priorities.slice(0, 3).map((p) => (
            <li key={p.id}>
              {internal(p.route) ? <Link to={p.route}>{p.label}</Link> : <span>{p.label}</span>}
              {p.why && <span className="prio-why">{plainIntel(p.why)}</span>}
            </li>
          ))}
        </ol>
      )}
      {next.limited?.note && <UpgradeLine note={next.limited.note} />}
      <SpecialistLink help={next.specialist_help} />
    </section>
  );
}

const SIGNALS = {
  financial_health: { title: 'Financial Health', to: '/company/financial-health' },
  capital_readiness: { title: 'Capital Readiness', to: '/capital/readiness' },
  company_record: { title: 'Company Record', to: '/company/record' },
  capital_need: { title: 'Capital need', to: '/capital/need' },
};

function Signal({ kind, s, high }) {
  const meta = SIGNALS[kind];
  if (!meta || !s) return null;
  let value; let line; let foot; let delta = null; let to = meta.to;
  if (kind === 'financial_health') {
    if (s.score == null) {
      value = s.status === 'not_applicable' ? 'Not scored' : 'Not yet'; // positioning §2.6: never "N/A"
      line = s.status === 'not_applicable' ? `${s.state_label || 'Dormant'}: not scored` : 'Needs your first check-in';
      if (s.status !== 'not_applicable') to = '/company/check-in';
    } else {
      value = s.score;
      line = [s.band, s.state_label].filter(Boolean).join(' · ');
      if (s.last_change?.delta) delta = { direction: s.last_change.direction, text: `${s.last_change.delta > 0 ? '+' : ''}${s.last_change.delta} since last` };
      else if (s.trend?.direction) delta = { direction: s.trend.direction, text: { up: 'Rising', down: 'Falling', flat: 'Steady' }[s.trend.direction] };
    }
    // A source label ("You told us") only names where a result came from; with no result there is nothing to label.
    foot = [s.score == null ? null : s.source_label, s.runway_months != null ? `${fmtMonths(s.runway_months)} runway` : s.cash_buffer_months != null ? `${fmtMonths(s.cash_buffer_months)} cash buffer` : null, s.computed_at ? fmtDate(s.computed_at) : null].filter(Boolean).join(' · ');
  } else if (kind === 'capital_readiness') {
    if (s.status === 'scored') {
      // Same whole number as the topbar pill and the sidebar badge (the exact score lives on Readiness).
      value = Math.round(Number(s.score));
      line = [s.band, s.provisional ? 'provisional' : null].filter(Boolean).join(' · ');
      foot = s.assessed_at ? `Assessed ${fmtDate(s.assessed_at)}` : s.label;
    } else { value = 'Not yet'; line = 'Not assessed'; foot = 'Take the assessment'; to = '/capital/readiness/assess'; }
  } else if (kind === 'company_record') {
    value = s.pct != null ? `${Math.round(Number(s.pct))}%` : 'Not yet';
    line = s.band;
    const f = s.freshness || {};
    foot = [f.missing ? `${f.missing} missing` : null, f.expiring ? `${f.expiring} expiring` : null, f.expired ? `${f.expired} expired` : null].filter(Boolean).join(' · ') || 'Up to date';
  } else if (kind === 'capital_need') {
    value = s.raise_usd ? fmtUsd(s.raise_usd) : 'Not set';
    line = s.raising ? `Raising${s.instrument ? ` · ${s.instrument}` : ''}` : s.confirmed ? `Not raising now${s.instrument ? ` · ${s.instrument}` : ''}` : 'Not confirmed yet';
    const t = s.timing;
    // "Start date: Company Intelligence" read as nonsense to a founder; a
    // passed target date is the founder's own date and is always said.
    const passed = s.target_funding_date && s.target_funding_date < todayIso();
    foot = passed ? `Target date ${fmtDate(s.target_funding_date)} has passed`
      : t?.start_by_label ? t.start_by_label // R-BE-F3: the API's own wording, "Start now (date passed)" | "Start by 31 Aug 2026"
      : t?.start_by && t.start_by < todayIso() ? `Start now: the ${fmtDate(t.start_by)} start date has passed`
      : t?.start_by ? `Start raising by ${fmtDate(t.start_by)}` : t?.status === 'no_target_date' ? 'Set a target date'
        : timingLabel(s.raise_timing) || (!s.confirmed ? "Confirm what you're raising" : '');
  }
  return (
    <Link to={to} className={`sig${high ? ' sig-high' : ''}`}>
      <span className="sig-name">{meta.title}{high && <span className="sig-flag"> · leads for you</span>}</span>
      <span className="sig-value">{value}</span>
      {line && <span className="sig-line">{line}</span>}
      {delta && <Delta direction={delta.direction}>{delta.text}</Delta>}
      {foot && <span className="sig-foot">{foot}</span>}
    </Link>
  );
}

/** Active raise only (D58 §5): each number links to its workflow. */
function RaiseStrip({ raise }) {
  return (
    <section className="raise" aria-labelledby="raise-h">
      <h2 id="raise-h" className="cc-h">Your raise <span className="raise-head">{raise.headline}</span></h2>
      <ol className="funnel">
        {(raise.funnel || []).map((f) => (
          <li key={f.key}><Link to={f.route}><span className="funnel-n">{f.count}</span><span className="funnel-l">{f.label}</span></Link></li>
        ))}
      </ol>
    </section>
  );
}

/** Deal room readiness, when it matters (D58 §6). The investor-facing room is not live yet (D55). */
function DealRoomLine({ dataRoom }) {
  return (
    <section className="cc-room" aria-label="Deal room">
      <Icon name="folder" />
      <div>
        <p className="cc-room-t">Data room {dataRoom ? `${dataRoom.completeness_pct}% ready` : ''}{dataRoom?.stage ? ` for ${dataRoom.stage}` : ''}</p>
        <p className="ui-muted">{dataRoom ? `${dataRoom.done_count} of ${plural(dataRoom.required_count, 'required item')} in place. ` : ''}Sharing with investors arrives with the Investor Deal Room.</p>
      </div>
      <Badge tone="outline">Investor Deal Room: coming soon</Badge>
      <Button as={Link} to="/capital/data-room" variant="link" size="sm">Prepare</Button>
    </section>
  );
}
