import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, PageHeader, ProgressBar, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getCompanyRecord, isUnavailable } from '../lib/companyIntel';
import { fmtDate } from '../lib/format';
import { LoadError } from '../components/capital/bits';
import { TrustNote, UpgradeLine, Delta, AskPrompts } from '../components/intel/IntelBits';

const BAND_TONE = { Complete: 'ok', 'In progress': 'info', 'Needs attention': 'warn' };
const STATE = {
  verified: { label: 'Verified', tone: 'ok' }, present: { label: 'In place', tone: 'ok' }, self_declared: { label: 'You told us', tone: 'info' },
  missing: { label: 'Missing', tone: 'neutral' }, expired: { label: 'Expired', tone: 'bad' }, not_applicable: { label: 'Not applicable', tone: 'outline' },
};
// Where each section's items are fixed.
const FIX = { profile: '/company', capital_need: '/capital/need', documents: '/capital/data-room' };

/**
 * Company Record (company-record.md): how complete the capital record is.
 * Completeness, not readiness; never feeds Capital Readiness. Free sees the
 * headline %; Company Intelligence lists every missing and expiring item.
 */
export default function CompanyRecordPage() {
  const { companyId } = useCompany();
  const q = useApi(() => (companyId ? getCompanyRecord(companyId) : null), [companyId]);
  const head = (
    <>
      <SubNav section="company" />
      <PageHeader eyebrow="Company" title="Company Record" subtitle="How complete your capital record is: the profile, capital need and documents a capital provider expects. Completeness, not readiness." />
    </>
  );
  if (q.error) {
    return <div className="rec">{head}{isUnavailable(q.error)
      ? <EmptyState icon="check" title="Company Record isn't switched on here yet." body="It appears once Company Intelligence is enabled on this server." />
      : <LoadError error={q.error} onRetry={q.reload} what="your Company Record" />}</div>;
  }
  if (!q.data) return <div className="rec">{head}<Skeleton h="160px" r="16px" /><Skeleton h="240px" r="12px" /></div>;

  const d = q.data;
  const r = d.result || {};
  const full = d.scope === 'full';
  const open = r.gates?.open_critical || [];
  const openCount = full ? open.length : r.gates?.open_critical_count || 0;
  const missing = d.missing || [];
  const expiring = d.expiring || [];
  const expired = full ? (r.items || []).filter((i) => i.state === 'expired') : [];
  const firstFix = missing[0] ? FIX[missing[0].section] || '/capital/data-room' : null;

  return (
    <div className="rec">
      {head}
      <section className="rec-hero" aria-label="Your record">
        <div className="rec-pct"><span className="fh-num">{Math.round(Number(r.pct) || 0)}%</span><span className="fh-of">complete</span></div>
        <div className="rec-what">
          <p><Badge tone={BAND_TONE[r.band] || 'neutral'}>{r.band}</Badge>{d.change?.delta ? <> <Delta direction={d.change.direction}>{`${d.change.from.score}% → ${d.change.to.score}%`}</Delta></> : null}</p>
          <ProgressBar value={Number(r.pct) || 0} showValue={false} tone="gold" />
          <p className="ui-muted">
            {openCount ? `${openCount} critical ${openCount === 1 ? 'item is' : 'items are'} still open, so the record can't be Complete yet. ` : ''}
            Verified: {Math.round(Number(r.verified_pct) || 0)}% (kept separate from completeness).
          </p>
        </div>
        {firstFix && <div className="fh-act"><Button as={Link} to={firstFix} variant="accent">Fix the first gap</Button></div>}
      </section>

      {full ? (
        <>
          {(expired.length > 0 || expiring.length > 0) && (
            <section className="rec-exp" aria-labelledby="rec-exp-h">
              <h2 id="rec-exp-h" className="cc-h">Expired and expiring</h2>
              <ul className="rec-list">
                {expired.map((i) => <li key={`x-${i.key}`}><span>{i.label}</span><Badge tone="bad" size="sm">Expired</Badge><Link to="/capital/data-room">Update</Link></li>)}
                {expiring.map((i) => <li key={`e-${i.key}`}><span>{i.label}</span><Badge tone="warn" size="sm">{`Expires in ${i.days_left} ${i.days_left === 1 ? 'day' : 'days'}`}</Badge><span className="ui-faint">{fmtDate(i.expires_at)}</span></li>)}
              </ul>
            </section>
          )}

          <section aria-labelledby="rec-miss-h">
            <h2 id="rec-miss-h" className="cc-h">What's missing <span className="cc-h-note">The five that add the most, critical first.</span></h2>
            {missing.length ? (
              <ul className="rec-list">
                {missing.slice(0, 5).map((m) => (
                  <li key={m.key}>
                    <span>{m.label}{m.critical && <Badge tone="gold" size="sm">Critical</Badge>}</span>
                    <span className="ui-faint">+{Math.round(Number(m.points) * 10) / 10}%</span>
                    <Link to={FIX[m.section] || '/capital/data-room'}>Add</Link>
                  </li>
                ))}
              </ul>
            ) : <p className="ui-muted">Nothing missing.</p>}
            {missing.length > 5 && <p className="ui-faint rec-more">{missing.length - 5} more in the sections below.</p>}
          </section>

          <section aria-labelledby="rec-sec-h">
            <h2 id="rec-sec-h" className="cc-h">Sections</h2>
            <div className="rec-secs">
              {(r.sections || []).filter((s) => s.counted !== false).map((s) => (
                <details key={s.key} className="rec-sec">
                  <summary>
                    <span className="rec-sec-l">{s.label}</span>
                    <span className="rec-sec-n">{s.done} of {s.applicable} · {Math.round(Number(s.pct))}%</span>
                  </summary>
                  <ul className="rec-items">
                    {(r.items || []).filter((i) => i.section === s.key).map((i) => {
                      const st = STATE[i.state] || STATE.missing;
                      return <li key={i.key}><span>{i.label}</span><Badge tone={st.tone} size="sm">{st.label}</Badge></li>;
                    })}
                  </ul>
                  <Link to={FIX[s.key] || '/capital/data-room'} className="rec-sec-go">Open {s.key === 'documents' ? 'the data room' : s.key === 'capital_need' ? 'capital need' : 'the profile'} →</Link>
                </details>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section>
          <p>{r.counts?.missing ? `${r.counts.missing} items are missing` : 'Nothing is missing'}{r.counts?.expiring ? `, ${r.counts.expiring} expiring soon` : ''}{r.counts?.expired ? `, ${r.counts.expired} expired` : ''}.</p>
          {r.critical_open?.length > 0 && (
            <div className="rec-critical">
              <p className="cc-h">Start with these: they stop your record being complete</p>
              <ul>{r.critical_open.map((c) => <li key={c.key}>{c.label}</li>)}</ul>
            </div>
          )}
          <div className="ui-row"><Button as={Link} to="/capital/data-room" variant="secondary">Open the data room</Button><Button as={Link} to="/company" variant="ghost">Open your profile</Button></div>
          <UpgradeLine note={d.locked?.note || 'Company Intelligence lists every missing and expiring item, with expiry alerts.'} />
        </section>
      )}

      <TrustNote
        what="The share of your capital record that is filled in: company profile (30), capital need (20) and the documents your stage needs (50). Section weights are provisional."
        source="Your profile, your capital need and your data room. Documents you tick 'I have this' count as complete but are marked as your word."
        updated={d.snapshot?.computed_at}
        why="Capital providers ask for these. A complete, current record makes every match and conversation faster. It does not change your readiness score." />

      <AskPrompts prompts={["What's missing from my record?", 'What expires soon?']} />
    </div>
  );
}
