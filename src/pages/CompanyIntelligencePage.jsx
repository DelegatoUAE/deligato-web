import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, PageHeader, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getWhatChanged, getAttention, getReassessment, getCapitalTiming, isUnavailable } from '../lib/companyIntel';
import { fmtDate, fmtUsd, plainIntel, todayIso } from '../lib/format';
import { bandLabel } from '../lib/readiness';
import { upgradeTarget } from '../lib/plan';
import { LoadError } from '../components/capital/bits';
import { ChangeList, AttentionList, UpgradeLine, TrustNote, AskPrompts } from '../components/intel/IntelBits';

const BAND = { fast: 'fast', moderate: 'moderate', slow: 'slow', cycle_bound: 'tied to intake cycles' };

/**
 * Company Intelligence (company-intelligence.md): the live layer of one
 * company. What changed, what needs attention, whether to re-take Capital
 * Readiness, and when to start raising (D46: capital timing, every state).
 * Free sees its own slice with a quiet plan line; the API decides the scope.
 */
export default function CompanyIntelligencePage() {
  const { companyId, company, readiness } = useCompany();
  const changedQ = useApi(() => (companyId ? getWhatChanged(companyId) : null), [companyId]);
  const attnQ = useApi(() => (companyId ? getAttention(companyId) : null), [companyId]);
  const reQ = useApi(() => (companyId ? getReassessment(companyId) : null), [companyId]);
  const timingQ = useApi(() => (companyId ? getCapitalTiming(companyId) : null), [companyId]);

  const head = (
    <>
      <SubNav section="company" />
      <PageHeader eyebrow="Company" title="Company Intelligence" subtitle="What changed, what needs attention, and what it means for your capital plans. Updated from your check-ins, record, readiness, matches and pipeline." />
    </>
  );
  if (changedQ.error && isUnavailable(changedQ.error)) {
    return <div className="ci">{head}<EmptyState icon="spark" title="Company Intelligence isn't switched on here yet." body="It appears once the live layer is enabled on this server." /></div>;
  }

  return (
    <div className="ci">
      {head}
      <div className="ci-grid">
        <section aria-labelledby="ci-attn" className="ci-attn">
          <h2 id="ci-attn" className="cc-h">Needs attention</h2>
          {attnQ.error ? <LoadError error={attnQ.error} onRetry={attnQ.reload} what="attention items" /> : !attnQ.data ? <Skeleton h="80px" /> : (
            <>
              <AttentionList items={attnQ.data.items} />
              {/* One plan line per card: when an item already carries its own, the card does not repeat it. */}
              {attnQ.data.scope === 'limited' && !(attnQ.data.items || []).some((a) => a.locked) && <UpgradeLine note="Your plan shows check-in and Financial Health items. Company Intelligence adds documents, readiness, deadlines and your pipeline." />}
            </>
          )}
        </section>

        <section aria-labelledby="ci-time" className="ci-time">
          <h2 id="ci-time" className="cc-h">When to start raising</h2>
          <Timing q={timingQ} company={company} />
        </section>
      </div>

      <section aria-labelledby="ci-re" className="ci-re">
        <h2 id="ci-re" className="cc-h">Capital Readiness</h2>
        <Reassessment q={reQ} readiness={readiness?.readiness} />
      </section>

      <section aria-labelledby="ci-ch">
        <h2 id="ci-ch" className="cc-h">What changed {changedQ.data?.since && <span className="cc-h-note">since {fmtDate(changedQ.data.since)}</span>}</h2>
        {changedQ.error ? <LoadError error={changedQ.error} onRetry={changedQ.reload} what="what changed" /> : !changedQ.data ? <Skeleton h="160px" /> : (
          <>
            <ChangeList items={changedQ.data.items} empty="Nothing material has changed in this period." />
            {changedQ.data.locked && <UpgradeLine note={changedQ.data.locked.note} />}
          </>
        )}
      </section>

      <AskPrompts prompts={['What changed this month?', "What's stopping me being more capital-ready?", 'When should I start raising?']} />
    </div>
  );
}

function Locked({ e, note }) {
  return <UpgradeLine note={note} to={upgradeTarget(e)} />;
}

/** D46 capital timing: "start raising by" + why (bound_by) + "set a target date". */
function Timing({ q, company }) {
  // Free: the founder's own plan stays visible (it is theirs); only the
  // worked-out start date and its reasoning are Company Intelligence.
  if (q.error?.status === 402) {
    const target = company?.target_funding_date ? String(company.target_funding_date).slice(0, 10) : null;
    const passed = target && target < todayIso();
    return (
      <div className="timing">
        <dl className="timing-facts">
          <div><dt>Raise</dt><dd>{company?.raise_usd ? `${fmtUsd(company.raise_usd)}${company.instrument ? ` · ${company.instrument}` : ''}` : 'Not set'}</dd></div>
          <div><dt>Target date</dt><dd>{target ? fmtDate(target) : 'Not set'}{passed && <> <Badge tone="bad" size="sm">Passed</Badge></>}</dd></div>
        </dl>
        {!target && <Button as={Link} to="/capital/need#target-date" variant="secondary" size="sm">Set a target date</Button>}
        <Locked e={q.error} note="Company Intelligence works out when to start raising from your route's usual length and, if you are burning cash, your runway." />
      </div>
    );
  }
  if (q.error) return <LoadError error={q.error} onRetry={q.reload} what="your capital timing" />;
  if (!q.data) return <Skeleton h="120px" />;
  const t = q.data.timing || {};
  const need = q.data.capital_need || {};
  const setTarget = <Button as={Link} to="/capital/need#target-date" variant={t.status === 'no_target_date' ? 'accent' : 'link'} size="sm">{need.target_funding_date ? 'Change target date' : 'Set a target date'}</Button>;
  if (t.status === 'no_target_date') {
    return (
      <div className="timing">
        <p className="timing-none">{plainIntel(t.message)}</p>
        {t.condition?.text && <p className="ui-muted">{plainIntel(t.condition.text)}</p>}
        {setTarget}
      </div>
    );
  }
  return (
    <div className="timing">
      <p className="timing-k">Start raising by</p>
      <p className="timing-date">{fmtDate(t.start_by)}</p>
      {t.attention && <Badge tone={t.attention.code === 'start_passed' || t.attention.code === 'target_infeasible' ? 'bad' : 'warn'} dot>{plainIntel(t.attention.text)}</Badge>}
      <p className="timing-why">{plainIntel(t.reason)}</p>
      {t.note && <p className="ui-muted">{plainIntel(t.note)}</p>}
      <dl className="timing-facts">
        {need.raise_usd ? <div><dt>Raise</dt><dd>{fmtUsd(need.raise_usd)}{need.instrument ? ` · ${need.instrument}` : ''}</dd></div> : null}
        <div><dt>Target date</dt><dd>{need.target_funding_date ? fmtDate(need.target_funding_date) : 'Not set'}</dd></div>
        <div><dt>Route length</dt><dd>{t.route?.months} months ({BAND[t.route?.band] || t.route?.band}){t.route?.basis === 'default' ? ', default' : ''}</dd></div>
      </dl>
      {setTarget}
      <TrustNote label="How this date is worked out"
        what="The latest date to begin preparing so the money can arrive in time. It is a plan, not a forecast."
        source={`Your capital need${need.target_funding_date ? ' and target date' : ''}, the usual process length for the route${t.condition?.state === 'burning' ? ', and your runway from Financial Health' : ''}. The duration table is provisional.`}
        updatedText="Worked out each time you open this page, from your latest figures."
        why={t.bound_by === 'runway' ? 'Your runway gives the earlier date, so it wins.' : 'Your target date minus the route length and one month of preparation.'} />
    </div>
  );
}

function Reassessment({ q, readiness }) {
  if (q.error?.status === 402) {
    return (
      <>
        {readiness?.score != null
          ? <p>Your score <strong>{Math.round(Number(readiness.score))}</strong> · {bandLabel(readiness)} <Link to="/capital/readiness">See what drives it</Link></p>
          : <p className="ui-muted">No Capital Readiness score yet. <Link to="/capital/readiness/assess">Take the assessment</Link></p>}
        <Locked e={q.error} note="Company Intelligence checks your latest figures against your answers and tells you when a re-take is worth it." />
      </>
    );
  }
  if (q.error) return <LoadError error={q.error} onRetry={q.reload} what="the reassessment check" />;
  if (!q.data) return <Skeleton h="80px" />;
  const d = q.data;
  const cs = d.current_score;
  return (
    <div className="reas">
      {cs ? <p>Current score <strong>{cs.score}</strong>{cs.band ? ` · ${cs.band}` : ''} <span className="ui-faint">· {plainIntel(cs.label)}</span></p> : <p className="ui-muted">No paid Capital Readiness assessment yet.</p>}
      {d.recommended ? (
        <>
          <p className="reas-rec"><Badge tone="warn" dot>Reassessment recommended</Badge></p>
          <ul className="reas-list">{d.reassessment.contradictions.map((c) => <li key={c.question}>{plainIntel(c.text)}</li>)}</ul>
          <p className="ui-muted">Your current score stays until you re-take it. Nothing is re-run automatically, and no new score is predicted.</p>
          <Button as={Link} to="/capital/readiness" variant="secondary" size="sm">Review Capital Readiness</Button>
        </>
      ) : cs ? <p className="ui-muted">Your answers still match your latest figures. No re-take needed.</p> : <Button as={Link} to="/capital/readiness/assess" variant="secondary" size="sm">Take the assessment</Button>}
    </div>
  );
}
