import { useState } from 'react';
import { Alert, Button, ChipToggle, EmptyState, ProgressBar, Skeleton } from '../../design/ui';
import useApi from '../../lib/useApi';
import { getReadinessQuestions, assessReadiness } from '../../lib/companies';
import { isMissingEndpoint } from '../../lib/auth';

function visible(q, answers) {
  const s = q.showIf;
  if (!s) return true;
  const a = answers[s.question];
  if (s.equals !== undefined) return a === s.equals;
  if (s.notEquals !== undefined) return a !== undefined && a !== s.notEquals;
  return true;
}

/**
 * Conncct Capital Readiness questionnaire, served by the ReadinessProvider
 * adapter (D14). The score comes back from the provider; nothing is scored here.
 */
export default function ReadinessQuestionnaire({ companyId, onScored, onCancel }) {
  const qQ = useApi(() => getReadinessQuestions(), []);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (qQ.error) {
    return isMissingEndpoint(qQ.error)
      ? <EmptyState compact icon="info" title="The readiness questionnaire isn't connected here yet." body="Your score from Conncct is shown above. You can retake the questions in Conncct." />
      : <Alert tone="bad">Couldn't load the questions. {qQ.error.message}</Alert>;
  }
  if (!qQ.data) return <Skeleton variant="text" lines={6} />;

  const questions = (qQ.data.questions || []).filter((q) => visible(q, answers));
  const required = questions.filter((q) => !q.optional);
  const answered = required.filter((q) => answers[q.key] !== undefined && answers[q.key] !== '' && !(Array.isArray(answers[q.key]) && !answers[q.key].length)).length;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const out = await assessReadiness(companyId, answers);
      onScored?.(out);
    } catch (e) {
      setError(e.body?.error?.details ? e.body.error.details.map((d) => d.message).join(' ') : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rq">
      <ProgressBar value={answered} max={required.length || 1} label="Answered" valueText={`${answered} of ${required.length}`} />
      <ol className="rq-list">
        {questions.map((q) => (
          <li key={q.key} className="rq-item">
            <p className="rq-q">{q.q}{q.optional && <span className="ui-label-opt"> Optional</span>}</p>
            {q.hint && <p className="rq-hint">{q.hint}</p>}
            <ChipToggle
              label={q.q}
              single={q.type !== 'multi'}
              options={q.opts}
              value={q.type === 'multi' ? (answers[q.key] || []) : answers[q.key] ? [answers[q.key]] : []}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: q.type === 'multi' ? v : v[0] }))}
            />
          </li>
        ))}
      </ol>
      {error && <Alert tone="bad">Couldn't score your answers. {error}</Alert>}
      <div className="ui-row">
        <Button variant="accent" onClick={submit} loading={busy} disabled={answered < required.length}>Get my readiness score</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        {answered < required.length && <span className="ui-muted">Answer every required question to see your score.</span>}
      </div>
      <p className="ui-faint">Scored by {qQ.data.label || 'the Conncct engine'} · methodology {qQ.data.methodology || 'conncct-14'} v{qQ.data.methodology_version || '–'}.</p>
    </div>
  );
}
