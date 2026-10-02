import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, EmptyState, ProgressBar, Skeleton, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getReadinessQuestions, assessReadiness } from '../lib/companies';
import { readinessSource } from '../lib/readiness';
import { isMissingEndpoint } from '../lib/auth';

// 15 §7: this spec owns the "why we ask" lines; the questions come from the provider.
const WHY = {
  runway: 'Runway shapes how much time you have to raise and how hard you can negotiate.',
  raise_amount: 'Investors compare the size of the raise with what it costs to run the company.',
  annual_operating_cost: 'Paired with the raise, this shows how long the money would last.',
  valuation: "Paired with the raise, this shows how much of the company you'd sell.",
  breakeven_timing: 'Investors weigh your runway against your path to breakeven.',
  next_milestone: 'A raise tied to a clear milestone is easier to back.',
  has_debt: 'Existing debt changes what new investors take on.',
  debt_type: 'Existing debt changes what new investors take on.',
  revenue_stability: 'Predictable revenue lowers the risk investors see.',
  setback_response: "How you plan for setbacks tells investors how you'll handle the hard months.",
  founder_experience: 'Investors back teams as much as plans.',
  team_strengths: 'Investors back teams as much as plans.',
  decision_style: "How you decide tells investors how you'll use their capital.",
  risk_appetite: 'Investors look for ambition that stays disciplined.',
};

function visible(q, answers) {
  const s = q.showIf || q.show_if;
  if (!s) return true;
  const a = answers[s.question];
  if (s.equals !== undefined) return a === s.equals;
  if (s.notEquals !== undefined) return a !== undefined && a !== s.notEquals;
  return true;
}
const optsOf = (q) => (q.opts || q.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label || o.value }));

/** 15 §4 · the questionnaire, one question per step. Scored only by the provider. */
export default function ReadinessAssessPage() {
  const { company, companyId, readiness, reloadCompanies, reloadReadiness } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const qQ = useApi(() => getReadinessQuestions(), []);
  const [answers, setAnswers] = useState({});
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (readiness?.readiness && readinessSource(readiness).key === 'conncct') return <Navigate to="/capital/readiness" replace />;
  if (qQ.error) {
    return isMissingEndpoint(qQ.error)
      ? <EmptyState icon="info" title="The readiness questions aren't connected in this environment yet." body="You can answer them in Conncct instead." />
      : <Alert tone="bad">Couldn't load the questions. {qQ.error.message}</Alert>;
  }
  if (!qQ.data) return <Skeleton h="320px" />;

  const qs = (qQ.data.questions || []).filter((q) => visible(q, answers));
  const required = qs.filter((q) => !q.optional);
  const answered = required.filter((q) => answers[q.key] !== undefined && !(Array.isArray(answers[q.key]) && !answers[q.key].length)).length;
  const idx = Math.min(i, qs.length - 1);
  const q = qs[idx];
  const multi = q.type === 'multi';
  const val = answers[q.key];
  const isLast = idx === qs.length - 1;
  const canNext = q.optional || (multi ? (val || []).length > 0 : val !== undefined);

  function choose(v) {
    setAnswers((a) => {
      if (!multi) return { ...a, [q.key]: v };
      const cur = a[q.key] || [];
      return { ...a, [q.key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  }
  async function finish() {
    setBusy(true); setError(null);
    try {
      await assessReadiness(companyId, answers);
      reloadCompanies();
      reloadReadiness();
      toast.success('Your readiness score is ready.');
      navigate('/capital/readiness');
    } catch (e) {
      setError(e.body?.error?.details?.length ? e.body.error.details.map((d) => d.message).join(' ') : e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="assess-page">
      <div className="assess-top">
        <h1>Capital readiness · {answered} of {required.length}</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/capital/readiness')}>Save and exit</Button>
      </div>
      <ProgressBar value={answered} max={required.length || 1} showValue={false} label={`${answered} of ${required.length} answered`} tone="gold" />
      <section className="assess-card" aria-labelledby="aq">
        <p className="assess-n">Question {idx + 1} of {qs.length}{q.optional ? ' · optional' : ''}</p>
        <h2 id="aq">{q.q || q.text}</h2>
        {q.hint && <p className="ui-muted">{q.hint}</p>}
        <div className="assess-opts" role={multi ? 'group' : 'radiogroup'} aria-labelledby="aq">
          {optsOf(q).map((o) => {
            const on = multi ? (val || []).includes(o.value) : val === o.value;
            return (
              <button key={o.value} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={on} className={`assess-opt${on ? ' is-on' : ''}`} onClick={() => choose(o.value)}>
                <span className="assess-dot" aria-hidden="true" />{o.label}
              </button>
            );
          })}
        </div>
        {WHY[q.key] && <p className="assess-why">Why we ask: {WHY[q.key].charAt(0).toLowerCase() + WHY[q.key].slice(1)}</p>}
      </section>
      {error && <Alert tone="bad">Couldn't score your answers. {error}</Alert>}
      <div className="assess-nav">
        <Button variant="ghost" onClick={() => setI(Math.max(0, idx - 1))} disabled={idx === 0}>Back</Button>
        {q.optional && !canNext && <Button variant="link" onClick={() => setI(idx + 1)}>Skip</Button>}
        {isLast
          ? <Button variant="accent" onClick={finish} loading={busy} disabled={answered < required.length}>See my score</Button>
          : <Button variant="primary" onClick={() => setI(idx + 1)} disabled={!canNext}>Next</Button>}
      </div>
      <p className="ui-faint">Uses Conncct's readiness method · {qQ.data.label || qQ.data.provider?.label || 'Conncct method'}. Your answers stay private to {company.name}.</p>
    </div>
  );
}
