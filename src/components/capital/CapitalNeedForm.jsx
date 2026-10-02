import { useState } from 'react';
import { Alert, Badge, Button, ChipToggle, FormField, Input, Select, Tag } from '../../design/ui';
import { useCompany } from '../company-context';
import { saveCapitalNeed } from '../../lib/companies';
import { TIMINGS, fmtUsd } from '../../lib/format';
import { logEvent } from '../../lib/events';

const FALLBACK_INSTRUMENTS = ['Equity', 'SAFE', 'Convertible note', 'Venture debt', 'Revenue-based', 'Grant', 'Loan'];
const NOT_SURE = '__not_sure__';
const EARLY = ['Idea', 'Pre-seed'];

function sourceTag(company, field, edited) {
  if (edited) return <Badge tone="info" size="sm">Edited here</Badge>;
  const src = company?.capital_need_sources?.[field];
  if (src === 'conncct' || (!src && company?.source === 'conncct' && company?.[field] != null)) return <Badge tone="outline" size="sm">From Conncct</Badge>;
  return null;
}

/**
 * The capital need: the only founder-editable intake (D8, 05-capital-need.md).
 * onSaved(result, { andFind }) is called after a successful save.
 */
export default function CapitalNeedForm({ firstRun = false, onSaved, submitLabel }) {
  const { company, meta } = useCompany();
  const vocab = meta?.vocab || {};
  const [form, setForm] = useState(() => ({
    raise_usd: company?.raise_usd != null ? String(Math.round(Number(company.raise_usd))) : '',
    instrument: company?.instrument || (company?.raise_usd != null ? NOT_SURE : ''),
    investor_types_sought: company?.investor_types_sought || [],
    target_markets: company?.target_markets || [],
    raise_timing: company?.raise_timing || '',
  }));
  const [edited, setEdited] = useState({});
  const [market, setMarket] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [timingNote, setTimingNote] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setEdited((e) => ({ ...e, [k]: true })); };
  const instruments = vocab.instruments || FALLBACK_INSTRUMENTS;
  const types = vocab.investor_types || [];
  const blocs = vocab.blocs || ['GLOBAL', 'GCC', 'MENA', 'EUROPE', 'UK', 'NORTH_AMERICA', 'AFRICA', 'ASIA'];
  const debtEarly = EARLY.includes(company?.stage) && ['Venture debt', 'Revenue-based'].includes(form.instrument);

  function addMarket(raw) {
    const v = String(raw || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (!v) return;
    if (!/^[A-Z]{2}$/.test(v) && !blocs.includes(v)) {
      setErrors((e) => ({ ...e, target_markets: 'Use a two-letter country code (AE, SA, GB) or a region from the list.' }));
      return;
    }
    if (!form.target_markets.includes(v)) set('target_markets', [...form.target_markets, v]);
    setErrors((e) => ({ ...e, target_markets: null }));
    setMarket('');
  }

  function validate() {
    const e = {};
    const n = Number(String(form.raise_usd).replace(/[^0-9.]/g, ''));
    if (!form.raise_usd || !Number.isFinite(n) || n <= 0) e.raise_usd = 'Enter the amount you are raising, in USD.';
    if (!form.instrument) e.instrument = "Choose an instrument, or 'Not sure yet'.";
    if (!form.raise_timing) e.raise_timing = 'Choose when you want to close.';
    setErrors(e);
    return Object.keys(e).length === 0 ? n : null;
  }

  async function submit(andFind) {
    const n = validate();
    if (n === null) return;
    setBusy(andFind ? 'find' : 'save');
    setSaveError(null);
    try {
      const need = {
        raise_usd: n,
        instrument: form.instrument === NOT_SURE ? null : form.instrument,
        investor_types_sought: form.investor_types_sought,
        target_markets: form.target_markets,
        raise_timing: form.raise_timing,
      };
      const out = await saveCapitalNeed(company.id, need);
      setTimingNote(!out.timingSaved);
      logEvent('capital_need.saved', { changed_fields: Object.keys(edited), raise_usd: n, instrument: need.instrument, raise_timing: need.raise_timing }, company.id);
      setEdited({});
      await onSaved?.(out, { andFind, need });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setBusy(null);
    }
  }

  const uof = Array.isArray(company?.use_of_funds) ? company.use_of_funds : [];

  return (
    <form className="need ui-form" onSubmit={(e) => { e.preventDefault(); submit(true); }} noValidate>
      <FormField label={<span className="need-label">How much are you raising? {sourceTag(company, 'raise_usd', edited.raise_usd)}</span>} required error={errors.raise_usd}
        hint={form.raise_usd && Number(form.raise_usd) > 0 ? `${fmtUsd(form.raise_usd)}` : 'USD'}>
        <Input prefix="$" numeric value={form.raise_usd} onChange={(e) => set('raise_usd', e.target.value.replace(/[^0-9]/g, ''))} placeholder="1500000" />
      </FormField>

      <FormField label={<span className="need-label">Instrument {sourceTag(company, 'instrument', edited.instrument)}</span>} required error={errors.instrument}
        hint="Choose what you'll actually offer. 'Not sure yet' shows as unknown on every match.">
        <Select value={form.instrument} onChange={(e) => set('instrument', e.target.value)} placeholder="Choose…"
          options={[...instruments.map((i) => ({ value: i, label: i })), { value: NOT_SURE, label: 'Not sure yet' }]} />
      </FormField>
      {debtEarly && <Alert tone="warn">Few investors offer venture debt at {company.stage}. Expect few matches.</Alert>}

      <FormField wide label={<span className="need-label">Investor types you want {sourceTag(company, 'investor_types_sought', edited.investor_types_sought)}</span>} hint="Leave all off to see every type.">
        {() => <ChipToggle label="Investor types" options={types} value={form.investor_types_sought} onChange={(v) => set('investor_types_sought', v)} />}
      </FormField>

      <FormField wide label={<span className="need-label">Markets you'll serve {sourceTag(company, 'target_markets', edited.target_markets)}</span>} error={errors.target_markets}
        hint="Two-letter country codes or regions, e.g. AE, SA, GCC.">
        {(id, describedBy) => (
          <div className="need-markets">
            <div className="ui-tags">
              {form.target_markets.map((m) => <Tag key={m} onRemove={() => set('target_markets', form.target_markets.filter((x) => x !== m))} removeLabel={`Remove ${m}`}>{m}</Tag>)}
              {!form.target_markets.length && <span className="ui-muted">No markets set</span>}
            </div>
            <div className="ui-row">
              <Input id={id} aria-describedby={describedBy} value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Add country or region"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMarket(market); } }} list="need-blocs" style={{ maxWidth: 220 }} />
              <datalist id="need-blocs">{blocs.map((b) => <option key={b} value={b} />)}</datalist>
              <Button variant="secondary" size="sm" onClick={() => addMarket(market)}>Add</Button>
            </div>
          </div>
        )}
      </FormField>

      <FormField wide label="When do you want to close?" required error={errors.raise_timing}>
        {() => <ChipToggle single label="Timing" options={TIMINGS.map((t) => ({ key: t.key, label: t.label }))} value={form.raise_timing ? [form.raise_timing] : []} onChange={(v) => set('raise_timing', v[0] || '')} />}
      </FormField>

      {uof.length > 0 && (
        <div className="need-uof is-wide">
          <span className="ui-label">Use of funds <Badge tone="outline" size="sm">From Conncct</Badge></span>
          <p>{uof.map((u) => `${u.category}${u.pct != null ? ` ${u.pct}%` : ''}`).join(' · ')}</p>
        </div>
      )}

      <p className="need-note is-wide">Your readiness score is calculated in Conncct and isn't changed here.</p>
      {saveError && <Alert tone="bad">Couldn't save your capital need. {saveError}</Alert>}
      {timingNote && <Alert tone="warn">Saved your raise, instrument, investor types and markets. Your timing couldn't be stored yet; it stays on this screen until the companies service is connected.</Alert>}
      <div className="need-actions is-wide">
        {!firstRun && <Button variant="secondary" onClick={() => submit(false)} loading={busy === 'save'} disabled={Boolean(busy)}>Save</Button>}
        <Button type="submit" variant="accent" loading={busy === 'find'} disabled={Boolean(busy)}>{submitLabel || (firstRun ? 'Confirm and find capital' : 'Save and see routes')}</Button>
      </div>
    </form>
  );
}
