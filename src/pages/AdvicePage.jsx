import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, Modal, PageHeader, SkeletonCards, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { GateCard, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getUnlocks, runMatch, investorHref, filterLabel } from '../lib/capital';
import { getAdvice } from '../lib/advice';
import { saveCapitalNeed, conncctLink } from '../lib/companies';
import { expertiseForFactor } from '../lib/actions';
import { fmtInt, fmtUsd } from '../lib/format';
import { logEvent } from '../lib/events';

const NEED_FIELDS = ['raise_usd', 'instrument', 'investor_types_sought'];
const fmtVal = (field, v) => (v === null || v === undefined ? 'not set' : field === 'raise_usd' ? fmtUsd(v) : Array.isArray(v) ? (v.length ? v.join(', ') : 'any type') : String(v));

function GainLoss({ u }) {
  return (
    <span className="gl">+{fmtInt(u.unlocks)} gained · −{fmtInt(u.loses)} lost · net <b className={u.net < 0 ? 'neg' : 'pos'}>{u.net > 0 ? '+' : ''}{fmtInt(u.net)}</b></span>
  );
}

export default function AdvicePage() {
  const { company, companyId, readiness, entitlements, reloadCompanies, reloadRun } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const uq = useApi(() => getUnlocks(companyId), [companyId]);
  const aq = useApi(() => getAdvice(companyId), [companyId]);
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);
  const r = readiness?.readiness;
  const trial = entitlements?.improvement_plan !== 'full';
  const href = conncctLink(company);

  async function apply(u) {
    setApplying(true);
    try {
      const need = {};
      for (const [k, v] of Object.entries(u.patch || { [u.field]: u.to })) if (NEED_FIELDS.includes(k)) need[k] = v;
      await saveCapitalNeed(companyId, need);
      logEvent('advice.lever_applied', { field: u.field, from: u.from, to: u.to, unlocks: u.unlocks, loses: u.loses, net: u.net }, companyId);
      const res = await runMatch(companyId);
      reloadCompanies(); reloadRun();
      toast.success(`Applied. Your matches were re-run (${fmtInt(res.counts?.eligible)} eligible).`);
      navigate(`/capital/matches${res.run_id ? `?run=${res.run_id}` : ''}`);
    } catch (e) {
      toast.error(`Couldn't apply this: ${e.message}`);
    } finally { setApplying(false); setPreview(null); }
  }

  const head = <><SubNav section="capital" /><PageHeader title="Improve your matches" subtitle={`What would open more, or better, investors for ${company.name}. Based on today's database.`} /></>;
  if (uq.error && uq.error.status !== 503) return <div>{head}<LoadError error={uq.error} onRetry={uq.reload} what="your options" /></div>;
  if (!uq.data && !uq.error) return <div>{head}<SkeletonCards count={4} height={90} /></div>;

  const d = uq.data || {};
  const dom = d.blockers?.dominant_blocker;
  let unlocks = d.unlocks || [];
  if (dom) unlocks = [...unlocks.filter((u) => u.kind === dom.dimension || u.field === dom.dimension), ...unlocks.filter((u) => !(u.kind === dom.dimension || u.field === dom.dimension))];
  unlocks = [...unlocks.filter((u) => u.net >= 0), ...unlocks.filter((u) => u.net < 0)];
  const resolvable = d.resolvable || [];
  const visibleUnlocks = trial ? unlocks.slice(0, 2) : unlocks;
  const hidden = unlocks.length - visibleUnlocks.length;
  const links = aq.data?.readiness_links || [];
  const gaps = aq.data?.data_gaps || [];
  const improvements = (r?.improvements || []).slice(0, 3);

  return (
    <div className="advice">
      {head}
      {uq.error?.status === 503 && <Alert tone="bad" action={<Button size="sm" variant="secondary" onClick={uq.reload}>Retry</Button>}>Couldn't work out options right now.</Alert>}
      {dom && (
        <Card className="advice-dom" eyebrow="The biggest thing holding you back">
          <p className="advice-dom-text">{dom.label || filterLabel(dom.dimension)} is a reason for {fmtInt(dom.also_involved)} of {fmtInt(d.blockers.excluded)} exclusions ({dom.share_of_excluded}%). It's the only reason for {fmtInt(dom.sole_blocker)} of them.</p>
        </Card>
      )}

      {uq.data && (
        <Card title="Options you control">
          {visibleUnlocks.length ? (
            <ul className="levers">
              {visibleUnlocks.map((u) => {
                const here = NEED_FIELDS.includes(u.field);
                return (
                  <li key={`${u.kind}-${String(u.to)}`} className={`lever${u.net < 0 ? ' is-neg' : ''}`}>
                    <div className="lever-head"><strong>{u.label}</strong><GainLoss u={u} /></div>
                    {u.actionable && <p className="ui-muted">{u.actionable}</p>}
                    {u.caveat && <p className="lever-caveat">{u.caveat}</p>}
                    {u.net < 0 && <p className="lever-neg">Net loss: you'd lose {fmtInt(u.loses)} sources you qualify for today to gain {fmtInt(u.unlocks)}.</p>}
                    {u.examples?.length > 0 && (
                      <p className="ui-muted">e.g. {u.examples.map((x, i) => <span key={x.record_id}>{i ? ' · ' : ''}<Link to={investorHref(x.record_id)}>{x.name}</Link></span>)}</p>
                    )}
                    {here ? (
                      <>
                        <p className="ui-faint">Your choice stays yours. Only change your raise if it's right for the company.</p>
                        <Button size="sm" variant="secondary" onClick={() => { setPreview(u); logEvent('advice.lever_tried', { field: u.field, net: u.net }, companyId); }}>Try this</Button>
                      </>
                    ) : (
                      <>
                        {u.field === 'stage' && <p className="ui-faint">Stage must stay credible. Stage is set in Conncct.</p>}
                        <Button as="a" href={href} target="_blank" rel="noreferrer" size="sm" variant="secondary">Update in Conncct ↗</Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : <p className="ui-muted">Nothing to change right now. No option opens meaningfully more investors.</p>}
          {hidden > 0 && <GateCard compact title={`${hidden} more options are included from Investor-Ready.`} />}
        </Card>
      )}

      {resolvable.length > 0 && (
        <Card title="Let investors be properly checked">
          <ul className="levers">
            {resolvable.map((x) => (
              <li key={x.field} className="lever">
                <p><strong>{x.label} so {fmtInt(x.moves_from_unknown)} investors can be properly checked.</strong></p>
                <p className="ui-muted">Some will fit, some won't. Your list may get shorter but more accurate.{x.field === 'instrument' ? " Today these count as eligible only because we don't know your instrument." : ''}</p>
                {NEED_FIELDS.includes(x.field) ? <Button as={Link} to="/capital/need" size="sm" variant="secondary">Set in Capital need</Button>
                  : <Button as="a" href={href} target="_blank" rel="noreferrer" size="sm" variant="secondary">Update in Conncct ↗</Button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="What investors are looking for" subtitle="Readiness in Conncct">
        {links.length ? (
          <ul className="levers">{links.map((l, i) => (
            <li key={l.id || i} className="lever">
              <p><strong>{l.factor_label || l.factor}</strong>{l.points != null ? ` · Conncct factor ${l.points} / ${l.max}` : ''}</p>
              {l.message && <p className="ui-muted">{l.message}</p>}
            </li>
          ))}</ul>
        ) : improvements.length ? (
          <ul className="levers">{improvements.map((imp, i) => {
            const f = r.factors?.find((x) => x.key === imp.factor);
            const skill = expertiseForFactor(imp.factor);
            return (
              <li key={i} className="lever">
                <p><strong>{f?.label || imp.label || imp.factor}</strong>{f ? ` · Conncct factor ${f.points} / ${f.max}` : ''}</p>
                <p className="ui-muted">Conncct suggests: {imp.action}{imp.impact_points ? ` (Conncct estimate +${imp.impact_points})` : ''}</p>
                <div className="ui-row">
                  <Button as="a" href={conncctLink(company, 'readiness')} target="_blank" rel="noreferrer" size="sm" variant="secondary">Improve in Conncct ↗</Button>
                  {skill && <Button as={Link} to={`/experts?skill=${encodeURIComponent(skill)}&factor=${imp.factor}`} size="sm" variant="ghost">Get expert help: {skill}</Button>}
                </div>
              </li>
            );
          })}</ul>
        ) : <p className="ui-muted">No readiness suggestions from Conncct yet.</p>}
      </Card>

      {gaps.length > 0 && (
        <Card title="Help us know more" subtitle="Our data">
          <ul className="plain-list">{gaps.map((g, i) => <li key={i}>{g.message || `${fmtInt(g.count)} possible fits have no ${g.field} on record.`}</li>)}</ul>
        </Card>
      )}
      {!uq.data?.unlocks?.length && !resolvable.length && !dom && uq.data && (
        <EmptyState icon="check" title="Nothing to change right now." body="No option opens meaningfully more investors, and your profile has no blanks." />
      )}
      <p className="ui-muted">Not sure where to start? <Link to="/experts?kind=capital_assessment">Request a Capital Assessment</Link>: $99, a 40-minute advisor session, credited against any package.</p>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.label} description="What changes if you apply this to your capital need and re-run."
        footer={<><Button variant="ghost" onClick={() => setPreview(null)}>Cancel</Button><Button variant="primary" loading={applying} onClick={() => apply(preview)}>Apply to my capital need and re-run</Button></>}>
        {preview && (
          <div className="ui-stack">
            <p>{filterLabel(preview.field)}: {fmtVal(preview.field, preview.from)} → <strong>{fmtVal(preview.field, preview.to)}</strong></p>
            <p><GainLoss u={preview} /></p>
            {preview.caveat && <Alert tone="warn">{preview.caveat}</Alert>}
            <p className="ui-faint">Your choice stays yours. Only change your raise if it's right for the company.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
