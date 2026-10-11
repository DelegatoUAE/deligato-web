import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, FormField, Input, Modal, Select, Skeleton, Textarea, useToast } from '../../design/ui';
import useApi from '../../lib/useApi';
import { bookPlanExpertTime, getAdvisory } from '../../lib/billing';
import { benefitLines, billingErrorCopy, bookingOptions, minutesLabel } from '../../lib/pricing';
import { isMissingEndpoint } from '../../lib/auth';

/**
 * D73 benefits that depend on paid time (RC3 phase 3), worded from the API only:
 *   - the Capital Readiness Report included in Capital Intelligence and Capital Raising (monthly: after the
 *     first renewal; yearly: at once)
 *   - expert time per subscription year (40 minutes / 2 hours; monthly: from the third paid month), booked
 *     here against the API's ledger. An advisor confirms a time; nothing is charged in the app.
 * `benefits` = GET /billing/subscription -> benefits. Renders nothing when the plan includes neither.
 */
export default function PlanBenefits({ benefits, companyId, onBooked, title = 'Included in your plan' }) {
  const lines = benefitLines(benefits);
  const [open, setOpen] = useState(false);
  if (!lines.readiness && !lines.advisory) return null;
  const tone = { open: 'ok', active: 'ok', pending: 'outline', ending: 'warn' };
  return (
    <Card title={title}>
      <dl className="facts bill-benefits">
        {lines.readiness && (
          <div>
            <dt>Capital Readiness Report</dt>
            <dd><Badge tone={tone[lines.readiness.state]} size="sm">{lines.readiness.state === 'open' ? 'Ready' : 'Opens later'}</Badge> {lines.readiness.text}
              {lines.readiness.state === 'open' && <> <Link to="/capital/readiness">Open your readiness</Link></>}</dd>
          </div>
        )}
        {lines.advisory && (
          <div>
            <dt>Expert time</dt>
            <dd><Badge tone={tone[lines.advisory.state]} size="sm">{lines.advisory.state === 'active' ? minutesLabel(lines.advisory.balance) : lines.advisory.state === 'pending' ? 'Opens later' : 'Ended'}</Badge> {lines.advisory.text}</dd>
          </div>
        )}
      </dl>
      {lines.advisory?.canBook && (
        <div className="ui-row"><Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Book expert time</Button></div>
      )}
      {open && <BookExpertTime companyId={companyId} balance={lines.advisory.balance} onClose={() => setOpen(false)} onBooked={() => { setOpen(false); onBooked?.(); }} />}
    </Card>
  );
}

/** Expert time card for the Experts page: reads the ledger itself (GET /experts/advisory). */
export function PlanExpertTime({ companyId }) {
  const q = useApi(() => (companyId ? getAdvisory(companyId).catch((e) => (isMissingEndpoint(e) ? null : Promise.reject(e))) : null), [companyId]);
  if (!companyId || q.error || q.data === null) return null;
  if (!q.data) return <Skeleton h="72px" />;
  return <PlanBenefits companyId={companyId} benefits={{ advisory: q.data }} onBooked={q.reload} title="Expert time in your plan" />;
}

function BookExpertTime({ companyId, balance, onClose, onBooked }) {
  const toast = useToast();
  const options = bookingOptions(balance);
  const [minutes, setMinutes] = useState(options.includes(40) ? 40 : options[options.length - 1]);
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  async function book() {
    setBusy(true);
    try {
      const out = await bookPlanExpertTime({ companyId, minutes: Number(minutes), topic: topic.trim() || 'Expert time from my plan', note });
      toast.success(`Booked ${minutesLabel(out.advisory?.reserved_minutes || minutes)}. An advisor will confirm a time with you. No payment is taken.`);
      onBooked();
    } catch (e) {
      const c = billingErrorCopy(e);
      toast.error(`${c.title} ${c.body}`.trim());
    } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} size="sm" title="Book expert time"
      description={`${minutesLabel(balance)} left this subscription year. The time is set aside now; an advisor confirms when.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={book}>Book {minutesLabel(minutes)}</Button></>}>
      <FormField label="Session length">
        <Select value={String(minutes)} onChange={(e) => setMinutes(Number(e.target.value))}>
          {options.map((m) => <option key={m} value={m}>{minutesLabel(m)}</option>)}
        </Select>
      </FormField>
      <FormField label="What do you want help with?" optional><Input value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. review my deck before investor meetings" /></FormField>
      <FormField label="Anything we should know?" optional><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
    </Modal>
  );
}
