import { useState } from 'react';
import { Link, useLocation, matchPath, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Drawer, Skeleton, Textarea } from '../design/ui';
import { useCompany } from './company-context';
import { runTask } from '../lib/intelligence';
import { isMissingEndpoint } from '../lib/auth';
import { humanise } from '../lib/format';

// Page → assistant screen key and starter chips (ia.md §3.1).
const PAGES = [
  ['/capital/matches/:recordId', 'investor_profile', ['Why is this a strong fit?', "What don't we know about them?", 'Draft a first note']],
  ['/capital/readiness/*', 'readiness', ['Explain my biggest gap', 'What do investors read into my runway?', 'Who could help me with this?']],
  ['/capital/find', 'find_capital', ['Why is venture debt recommended?', 'Why not VC?', 'What would change my routes?']],
  ['/capital/matches', 'matches', ['Why is this a strong fit?', "What don't we know about them?", 'Which should I contact first?']],
  ['/capital/pipeline', 'pipeline', ["Who haven't I followed up with?", 'Summarise my pipeline']],
  ['/capital/saved', 'pipeline', ['Which saved provider should I approach first?', 'Summarise my pipeline']],
  ['/capital/data-room', 'data_room', ["What's missing from my data room?", 'What do investors ask for at my stage?']],
  ['/capital/improve', 'advice', ['Which change opens the most investors?', 'Explain my biggest blocker']],
  ['/capital/*', 'matches', ['What should I do this week?', 'Which capital types fit us?']],
  ['/experts/*', 'experts', ['What kind of expert do I need?', 'Compare these two experts']],
  ['/company/*', 'company', ["What's missing from my profile?"]],
  ['/', 'home', ['What should I do this week?', 'Explain my readiness score', 'Which capital types fit us?']],
];

function pageContext(pathname) {
  for (const [pattern, screen, chips] of PAGES) {
    const m = matchPath({ path: pattern, end: !pattern.endsWith('*') }, pathname);
    if (m) return { screen, chips, recordId: m.params.recordId || null };
  }
  return { screen: 'other', chips: ['What should I do this week?'], recordId: null };
}

/** The contextual assistant (ia.md §3.1): explains and points, never acts. */
export default function AssistantPanel({ open, onClose }) {
  const { companyId, run } = useCompany();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const ctx = pageContext(pathname);
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ busy: false, result: null, error: null, asked: null });
  const [keepContext, setKeepContext] = useState(true);

  async function ask(q) {
    const text = String(q || '').trim();
    if (!text) return;
    setState({ busy: true, result: null, error: null, asked: text });
    try {
      const body = {
        company_id: companyId, screen: ctx.screen, question: text,
        ...(keepContext && ctx.recordId ? { record_id: ctx.recordId } : {}),
        ...(keepContext && (params.get('run') || run?.run_id) ? { run_id: params.get('run') || run.run_id } : {}),
      };
      const { company_id: cid, ...input } = body;
      const out = await runTask('assistant', { input, company_id: cid });
      setState({ busy: false, result: out, error: null, asked: text });
      setQuestion('');
    } catch (e) {
      setState({ busy: false, result: null, asked: text, error: isMissingEndpoint(e) || e.code === 'UNKNOWN_TASK' ? "The assistant isn't connected in this environment yet." : e.message });
    }
  }

  const out = state.result?.output;
  const ai = state.result && state.result.provider && state.result.provider !== 'heuristic';
  const internal = (r) => typeof r === 'string' && r.startsWith('/');

  return (
    <Drawer open={open} onClose={onClose} title="Ask AI" description="It explains what's on this page and points you to the next step. It never contacts anyone or changes anything.">
      <div className="ui-stack assist">
        {!companyId && <Alert tone="info">The assistant works once your company is in.</Alert>}
        {ctx.recordId && keepContext && (
          <p className="assist-ctx">Asking about: this capital provider <button type="button" className="linkish" onClick={() => setKeepContext(false)}>Clear</button></p>
        )}
        <div className="ui-tags">
          {ctx.chips.map((c) => (
            <button key={c} type="button" className="ui-tag" disabled={!companyId || state.busy} onClick={() => ask(c)}>{c}</button>
          ))}
        </div>
        <form className="ui-stack ui-stack-sm" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
          <Textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} placeholder="Ask about your readiness, routes, matches or pipeline." aria-label="Your question" />
          <div className="ui-row"><Button type="submit" variant="primary" size="sm" loading={state.busy} disabled={!companyId || !question.trim()}>Ask</Button></div>
        </form>
        {state.busy && <Skeleton variant="text" lines={4} />}
        {state.error && <Alert tone="bad">{state.error}</Alert>}
        {out && (
          <div className="assist-result">
            {state.asked && <p className="assist-q">“{state.asked}”</p>}
            <div className="ui-row"><Badge tone={ai ? 'gold' : 'outline'}>{ai ? 'AI-drafted' : 'Rules-based'}</Badge>{state.result.notice && <span className="ui-muted assist-notice">{state.result.notice}</span>}</div>
            <p>{out.answer}</p>
            {out.refused === 'advice' && <p className="ui-muted">I can't advise on that. An expert can. <Link to="/experts" onClick={onClose}>Find an Expert →</Link></p>}
            {(out.citations || []).length > 0 && (
              <p className="assist-cite">Based on: {out.citations.map((c) => `${humanise(c.field)} ${c.value ? `(${c.value}` : ''}${c.source ? `${c.value ? ', ' : '('}from ${c.source})` : c.value ? ')' : ''}`).join(' · ')}</p>
            )}
            {out.next_action?.label && (internal(out.next_action.route)
              ? <Button as={Link} to={out.next_action.route} variant="secondary" size="sm" onClick={onClose}>{out.next_action.label}</Button>
              : <p className="ui-muted">{out.next_action.label}</p>)}
            {(out.links || []).filter((l) => internal(l.route)).map((l) => <Link key={l.route + l.label} to={l.route} onClick={onClose} className="assist-link">{l.label} →</Link>)}
          </div>
        )}
        <p className="ui-faint assist-foot">Company-level facts only go to the AI provider, never names or contact details, and only with your consent. Without consent a rules-based answer is shown. No investment, legal or tax advice.</p>
      </div>
    </Drawer>
  );
}
