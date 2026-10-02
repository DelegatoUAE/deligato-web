import { useState } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Alert, Button, Drawer, Skeleton } from '../design/ui';
import AiOutput from './AiOutput';
import { useCompany } from './company-context';
import { runTask } from '../lib/intelligence';
import { getSource } from '../lib/capital';
import { isMissingEndpoint } from '../lib/auth';

/** Suggestions depend on where the founder is (contextual assistant, D19). */
function suggestionsFor(pathname) {
  const inv = matchPath('/capital/matches/:recordId', pathname);
  const list = [];
  if (inv) {
    list.push({ id: 'meeting', label: 'Prepare a meeting brief for this investor', task: 'investor_brief', recordId: inv.params.recordId });
  }
  list.push({ id: 'company', label: 'Summarise my company the way an investor would read it', task: 'company_brief' });
  return list;
}

export default function AssistantPanel({ open, onClose }) {
  const { companyId } = useCompany();
  const { pathname } = useLocation();
  const [state, setState] = useState({ busy: null, result: null, error: null });
  const suggestions = suggestionsFor(pathname);

  async function run(s) {
    setState({ busy: s.id, result: null, error: null });
    try {
      const input = {};
      if (s.recordId) {
        const { profile } = await getSource(s.recordId, companyId);
        input.investor = { ...profile, record_id: profile.record_id || s.recordId };
      }
      const out = await runTask(s.task, { input, company_id: companyId });
      setState({ busy: null, result: { ...out, label: s.label }, error: null });
    } catch (e) {
      setState({ busy: null, result: null, error: isMissingEndpoint(e) ? 'The AI assistant isn\'t connected in this environment yet.' : e.message });
    }
  }

  const r = state.result;
  return (
    <Drawer open={open} onClose={onClose} title="Ask AI" description="Help with what's on this page. It works from your company profile and our investor records, and says when it isn't sure.">
      <div className="ui-stack">
        {!companyId && <Alert tone="info">The assistant works once your company has arrived from Conncct.</Alert>}
        <div className="ui-stack-sm ui-stack">
          {suggestions.map((s) => (
            <Button key={s.id} variant="secondary" block onClick={() => run(s)} loading={state.busy === s.id} disabled={!companyId || Boolean(state.busy)}>
              {s.label}
            </Button>
          ))}
        </div>
        {state.busy && <Skeleton variant="text" lines={5} />}
        {state.error && <Alert tone="bad">{state.error}</Alert>}
        {r && <AiOutput result={r} />}
        <p className="ui-faint assist-foot">Company-level facts only are sent to the AI provider, never names or contact details, and only with your consent. Without consent the rules-based version runs.</p>
      </div>
    </Drawer>
  );
}
