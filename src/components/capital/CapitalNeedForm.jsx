import { useState } from 'react';
import { Alert, Badge, Button, ChipToggle, FormField, Input, Select, Tag } from '../../design/ui';
import { useCompany } from '../company-context';
import { saveCapitalNeed } from '../../lib/companies';
import { updateProfile } from '../../lib/capital';
import { TIMINGS, fmtUsd, countryName } from '../../lib/format';
import { COUNTRY_CODES, marketCode } from '../../lib/countries';
import { logEvent } from '../../lib/events';

const FALLBACK_INSTRUMENTS = ['Equity', 'SAFE', 'Convertible note', 'Venture debt', 'Revenue-based', 'Grant', 'Loan'];
const NOT_SURE = '__not_sure__';
const EARLY = ['Idea', 'Pre-seed'];
// The routing engine's purpose vocabulary (api modules/routing/facts.js PURPOSES).
// It drives which capital routes fit (D46); Find capital asks for it by name.
const PURPOSES = [
  { key: 'working_capital', label: 'Working capital' }, { key: 'product', label: 'Product and engineering' },
  { key: 'hiring', label: 'Hiring' }, { key: 'marketing', label: 'Sales and marketing' },
  { key: 'expansion', label: 'Expansion to new markets' }, { key: 'capex', label: 'Equipment or facilities' },
  { key: 'rnd', label: 'R&D, pilots, certification' }, { key: 'refinancing', label: 'Refinancing debt' },
  { key: 'acquisition', label: 'An acquisition' },
];

function sourceTag(company, field, edited) {
  if (edited) return <Badge tone="info" size="sm">Edited here</Badge>;
  const src = company?.capital_need_sources?.[field];
  if (src === 'conncct' || (!src && company?.source === 'conncct' && company?.[field] != null)) return <Badge tone="outline" size="sm">Imported</Badge>;
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
    purpose: Array.isArray(company?.purpose) ? company.purpose : [],
    // capital/eligibility.js#checkLocalPresence: true clears, false excludes,
    // null (not sure) keeps the "requires local presence" caveat.
    // D46: the date the money must be in the bank (capital timing = target − route duration − 1 month).
    target_funding_date: company?.target_funding_date ? String(company.target_funding_date).slice(0, 10) : '',
    willing_to_relocate: company?.willing_to_relocate === true ? 'yes' : company?.willing_to_relocate === false ? 'no' : 'unsure',
  }));
  const [edited, setEdited] = useState({});
  const [market, setMarket] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [timingNote, setTimingNote] = useState(false);
  const [targetNote, setTargetNote] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setEdited((e) => ({ ...e, [k]: true })); setErrors((e) => (e[k] ? { ...e, [k]: null } : e)); };
  const instruments = vocab.instruments || FALLBACK_INSTRUMENTS;
  const types = vocab.investor_types || [];
  const blocs = vocab.blocs || ['GLOBAL', 'GCC', 'MENA', 'EUROPE', 'UK', 'NORTH_AMERICA', 'AFRICA', 'ASIA'];
  const debtEarly = EARLY.includes(company?.stage) && ['Venture debt', 'Revenue-based'].includes(form.instrument);

  function addMarket(raw) {
    if (!String(raw || '').trim()) return;
    const v = marketCode(raw, blocs);
    if (!v) {
      setErrors((e) => ({ ...e, target_markets: 'Pick a country or a region from the list.' }));
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
    if (form.target_funding_date && form.target_funding_date < new Date().toISOString().slice(0, 10)) e.target_funding_date = 'Pick today or a later date.';
    setErrors(e);
    // UAT F29: on an invalid submit, focus moves to the first field to fix.
    if (Object.keys(e).length) requestAnimationFrame(() => document.querySelector('form.need [aria-invalid="true"], form.need .has-error input, form.need .has-error select, form.need .has-error button')?.focus());
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
        // Sent only when changed here, so a save never fails on a field the founder didn't touch.
        ...(edited.target_funding_date ? { target_funding_date: form.target_funding_date || null } : {}),
        ...(edited.purpose ? { purpose: form.purpose.length ? form.purpose : null } : {}),
      };
      const out = await saveCapitalNeed(company.id, need);
      // Not part of the routing capital-need allow-list: saved on the profile
      // (PATCH /capital/profiles/:id allows willing_to_relocate).
      const relocate = { yes: true, no: false, unsure: null }[form.willing_to_relocate];
      if (relocate !== (company?.willing_to_relocate ?? null) || edited.willing_to_relocate) await updateProfile(company.id, { willing_to_relocate: relocate });
      setTimingNote(!out.timingSaved);
      setTargetNote(Boolean(out.targetNotStored));
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

      <FormField wide label={<span className="need-label" id="purpose">What will the money be used for? {sourceTag(company, 'purpose', edited.purpose)}</span>}
        hint="Pick all that apply. It decides which kinds of capital fit, for example working capital lines or equipment finance.">
        {() => <ChipToggle label="Use of the money" options={PURPOSES} value={form.purpose} onChange={(v) => set('purpose', v)} />}
      </FormField>

      <FormField wide label={<span className="need-label">Investor types you want {sourceTag(company, 'investor_types_sought', edited.investor_types_sought)}</span>} hint="Leave all off to see every type.">
        {() => <ChipToggle label="Investor types" options={types} value={form.investor_types_sought} onChange={(v) => set('investor_types_sought', v)} />}
      </FormField>

      <FormField wide label={<span className="need-label">Markets you'll serve {sourceTag(company, 'target_markets', edited.target_markets)}</span>} error={errors.target_markets}
        hint="Countries or regions, e.g. Saudi Arabia, GCC, Europe.">
        {(id, describedBy) => (
          <div className="need-markets">
            <div className="ui-tags">
              {form.target_markets.map((m) => <Tag key={m} onRemove={() => set('target_markets', form.target_markets.filter((x) => x !== m))} removeLabel={`Remove ${countryName(m)}`}>{countryName(m)}</Tag>)}
              {!form.target_markets.length && <span className="ui-muted">No markets set</span>}
            </div>
            <div className="ui-row">
              <Input id={id} aria-describedby={describedBy} value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Add country or region"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMarket(market); } }} list="need-blocs" style={{ maxWidth: 220 }} />
              {/* One option per name: the UK bloc and GB both read "United Kingdom" (duplicate-key fix). */}
              <datalist id="need-blocs">{[...new Set([...blocs.map((b) => countryName(b)), ...COUNTRY_CODES.map((c) => countryName(c)).sort()])].map((n) => <option key={n} value={n} />)}</datalist>
              <Button variant="secondary" size="sm" onClick={() => addMarket(market)}>Add</Button>
            </div>
          </div>
        )}
      </FormField>

      <FormField wide label="Would you relocate or incorporate locally for the right investor?"
        hint="Some programmes and funds require a founder or entity in their country. 'Yes' keeps them in your matches, 'No' leaves them out, 'Not sure' shows them with a note.">
        {() => <ChipToggle single label="Relocate or incorporate locally" options={[{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }, { key: 'unsure', label: 'Not sure' }]}
          value={[form.willing_to_relocate]} onChange={(v) => set('willing_to_relocate', v[0] || 'unsure')} />}
      </FormField>

      <FormField wide label="When do you want to close?" required error={errors.raise_timing}>
        {() => <ChipToggle single label="Timing" options={TIMINGS.map((t) => ({ key: t.key, label: t.label }))} value={form.raise_timing ? [form.raise_timing] : []} onChange={(v) => set('raise_timing', v[0] || '')} />}
      </FormField>

      <FormField label={<span className="need-label">When do you need the money in the bank?</span>} error={errors.target_funding_date}
        hint="Optional. With a date, we tell you when to start raising for your route (Company Intelligence).">
        <Input id="target-date" type="date" value={form.target_funding_date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set('target_funding_date', e.target.value)} />
      </FormField>

      {uof.length > 0 && (
        <div className="need-uof is-wide">
          <span className="ui-label">Use of funds <Badge tone="outline" size="sm">Imported</Badge></span>
          <p>{uof.map((u) => `${u.category}${u.pct != null ? ` ${u.pct}%` : ''}`).join(' · ')}</p>
        </div>
      )}

      <p className="need-note is-wide">Your readiness score isn't changed here.</p>
      {saveError && <Alert tone="bad">Couldn't save your capital need. {saveError}</Alert>}
      {timingNote && <Alert tone="warn">Saved your raise, instrument, investor types and markets. Your timing couldn't be stored yet; it stays on this screen until the companies service is connected.</Alert>}
      {targetNote && <Alert tone="warn">Saved everything except your target date: it can't be stored on this server yet. Nothing else was lost.</Alert>}
      <div className="need-actions is-wide">
        {!firstRun && <Button variant="secondary" onClick={() => submit(false)} loading={busy === 'save'} disabled={Boolean(busy)}>Save</Button>}
        <Button type="submit" variant="accent" loading={busy === 'find'} disabled={Boolean(busy)}>{submitLabel || (firstRun ? 'Confirm and find capital' : 'Save and see routes')}</Button>
      </div>
    </form>
  );
}
