import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, FormField, Input, PageHeader, Select, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getCheckins, saveCheckin, isUnavailable } from '../lib/companyIntel';
import { fmtUsd, fmtDate } from '../lib/format';
import { LoadError } from '../components/capital/bits';
import { logEvent } from '../lib/events';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (p) => { const [y, m] = p.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
function recentMonths(now = new Date()) {
  const out = [];
  for (let i = 1; i <= 3; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
// AED and SAR are pegged on the server; any other currency would need an FX rate, so it is not offered.
const CURRENCIES = [{ value: 'USD', label: 'USD' }, { value: 'AED', label: 'AED' }, { value: 'SAR', label: 'SAR' }];
const digits = (s) => String(s ?? '').replace(/[^0-9.]/g, '');

/**
 * The 2-minute monthly check-in (company-intelligence.md §3, D38). Three
 * plain questions, prefilled from last time. A blank is never zero. Saved as
 * "You told us"; the Financial Health result comes back at once.
 */
export default function CheckInPage() {
  const { companyId, reloadCompanies } = useCompany();
  const q = useApi(() => (companyId ? getCheckins(companyId, 6) : null), [companyId]);
  const head = (
    <>
      <SubNav section="company" />
      <PageHeader eyebrow="Company · about 2 minutes" title="Monthly check-in" subtitle="Three figures from last month. We turn them into your Financial Health and show what changed." />
    </>
  );
  if (q.error) {
    return <div className="ckin">{head}{isUnavailable(q.error)
      ? <EmptyState icon="chart" title="The check-in isn't switched on here yet." body="It appears once Company Intelligence is enabled on this server." />
      : <LoadError error={q.error} onRetry={q.reload} what="your previous check-ins" />}</div>;
  }
  if (!q.data) return <div className="ckin">{head}<Skeleton h="320px" r="16px" /></div>;
  return <div className="ckin">{head}<Form companyId={companyId} history={q.data} onSaved={() => { q.reload(); reloadCompanies(); }} /></div>;
}

function Form({ companyId, history, onSaved }) {
  const months = recentMonths();
  const last = history.periods?.[0] || null;
  const prev = (k) => last?.figures?.[k];
  const [period, setPeriod] = useState(months[0]);
  const already = (history.periods || []).find((p) => p.period === period);
  const seed = already || last;
  const [f, setF] = useState(() => ({
    cash: seed?.figures?.cash?.value != null ? String(seed.figures.cash.value) : '',
    monthly_revenue: seed?.figures?.revenue?.value != null ? String(seed.figures.revenue.value) : '',
    monthly_operating_cost: seed?.figures?.gross_burn?.value != null ? String(seed.figures.gross_burn.value) : '',
    debt_service: seed?.figures?.debt_service?.value != null ? String(seed.figures.debt_service.value) : '',
    undrawn_facilities: seed?.figures?.undrawn_facilities?.value != null ? String(seed.figures.undrawn_facilities.value) : '',
    currency: seed?.figures?.cash?.currency || 'USD',
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'currency' ? e.target.value : digits(e.target.value) }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const body = { period, currency: f.currency };
    for (const k of ['cash', 'monthly_revenue', 'monthly_operating_cost', 'debt_service', 'undrawn_facilities']) if (f[k] !== '') body[k] = Number(f[k]);
    try {
      const out = await saveCheckin(companyId, body);
      setResult(out);
      logEvent('company_intel.checkin_saved', { period, fields: Object.keys(body).filter((k) => !['period', 'currency'].includes(k)) }, companyId);
      onSaved();
    } catch (x) {
      setErr(x.body?.error?.fields ? Object.values(x.body.error.fields).join(' ') : x.message);
    } finally { setBusy(false); }
  }

  if (result) {
    const r = result.financial_health?.result || {};
    const ch = result.financial_health?.change;
    return (
      <section className="ckin-done" aria-live="polite">
        <Badge tone="ok">Saved · You told us</Badge>
        <h2>{monthName(result.checkin.period)} is in.</h2>
        {r.score != null ? (
          <p className="ckin-res">Financial Health <strong>{r.score}</strong> · {r.band} · {r.state_label}{ch?.delta ? ` (${ch.delta > 0 ? '+' : ''}${ch.delta} since last time)` : ''}</p>
        ) : <p className="ckin-res">{r.status === 'not_applicable' ? 'No revenue and no costs: Financial Health does not apply.' : 'Add revenue and operating costs too, and your Financial Health appears.'}</p>}
        <div className="ui-row">
          <Button as={Link} to="/company/financial-health" variant="accent">See your Financial Health</Button>
          <Button as={Link} to="/" variant="ghost">Back to Home</Button>
        </div>
      </section>
    );
  }

  const hint = (k, label) => (prev(k)?.value != null && !already ? `Last time (${monthName(last.period)}): ${fmtUsd(prev(k).value_usd)}. ${label}` : label);

  return (
    <form className="ckin-form" onSubmit={submit} noValidate>
      <FormField label="Which month?" hint={already ? `You already told us about ${monthName(period)} on ${fmtDate(already.as_of)}. Saving again replaces those figures.` : 'Pick a month that has ended.'}>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={months.map((m) => ({ value: m, label: monthName(m) }))} />
      </FormField>
      <FormField label="Currency" hint="Every figure in this check-in uses it.">
        <Select value={f.currency} onChange={set('currency')} options={CURRENCIES} />
      </FormField>
      <FormField wide label="How much cash did you have at the end of the month?" hint={hint('cash', 'All bank balances together.')}>
        <Input numeric inputMode="decimal" value={f.cash} onChange={set('cash')} placeholder="e.g. 450000" />
      </FormField>
      <FormField wide label="How much revenue came in that month?" hint={hint('revenue', 'Leave blank if you are not sure; a blank is never counted as zero.')}>
        <Input numeric inputMode="decimal" value={f.monthly_revenue} onChange={set('monthly_revenue')} placeholder="e.g. 60000" />
      </FormField>
      <FormField wide label="What did it cost to run the company that month?" hint={hint('gross_burn', 'Salaries, rent, tools, marketing: total operating spend. Leave out loan repayments and equipment purchases.')}>
        <Input numeric inputMode="decimal" value={f.monthly_operating_cost} onChange={set('monthly_operating_cost')} placeholder="e.g. 90000" />
      </FormField>
      <details className="ckin-more is-wide">
        <summary>Loans or credit lines? (optional)</summary>
        <div className="ui-form ui-form-2">
          <FormField label="Loan repayments that month" hint="Principal plus interest.">
            <Input numeric inputMode="decimal" value={f.debt_service} onChange={set('debt_service')} />
          </FormField>
          <FormField label="Credit lines you have but haven't used" hint="Committed facilities only.">
            <Input numeric inputMode="decimal" value={f.undrawn_facilities} onChange={set('undrawn_facilities')} />
          </FormField>
        </div>
      </details>
      {err && <Alert tone="bad" className="is-wide">Nothing was saved. {err}</Alert>}
      <div className="need-actions is-wide">
        <span className="ui-faint">Labelled "You told us" until your books are connected.</span>
        <Button type="submit" variant="accent" loading={busy} disabled={!['cash', 'monthly_revenue', 'monthly_operating_cost'].some((k) => f[k] !== '')}>Save check-in</Button>
      </div>
    </form>
  );
}
