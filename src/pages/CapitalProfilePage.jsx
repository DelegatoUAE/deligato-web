import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCapitalMeta, listProfiles, createProfile, updateProfile, deleteProfile,
} from '../lib/capital';

// The intake. Everything collected here is a field the matching engine
// actually reads — nothing is asked for decoration. The copy next to each
// group says what it unlocks, because an unanswered question becomes an
// "unknown" in the results rather than a silent default.

const EMPTY = {
  company_name: '', one_liner: '', description: '', website: '',
  stage: '', sector: '', business_model: '', instrument: 'Equity',
  raise_usd: '', revenue_usd: '', hq_country_iso2: '',
  target_markets: [], investor_types_sought: [], founder_attributes: [], keywords: [],
  willing_to_relocate: null, traction: '',
};

const FOUNDER_ATTRS = [
  'Female founder', 'Under-represented founder', 'Student/alumni', 'Technical founder',
];

function CsvField({ label, hint, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={(value || []).join(', ')}
        onChange={(e) => onChange(
          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
        )}
      />
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export default function CapitalProfilePage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetchCapitalMeta().then(setMeta).catch((e) => setError(e.message));
    listProfiles().then((d) => setProfiles(d.profiles)).catch((e) => setError(e.message));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function loadForEdit(p) {
    setEditingId(p.id);
    setForm({
      ...EMPTY,
      ...p,
      raise_usd: p.raise_usd ?? '',
      revenue_usd: p.revenue_usd ?? '',
    });
    setNotice(null);
    setError(null);
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setNotice(null);
  }

  function toggleAttr(attr) {
    setForm((f) => ({
      ...f,
      founder_attributes: f.founder_attributes.includes(attr)
        ? f.founder_attributes.filter((a) => a !== attr)
        : [...f.founder_attributes, attr],
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.company_name.trim()) {
      setError('Company name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        raise_usd: form.raise_usd === '' ? null : Number(form.raise_usd),
        revenue_usd: form.revenue_usd === '' ? null : Number(form.revenue_usd),
        hq_country_iso2: form.hq_country_iso2 ? form.hq_country_iso2.toUpperCase() : null,
      };
      const saved = editingId
        ? await updateProfile(editingId, payload)
        : await createProfile(payload);
      const id = saved.profile.id;
      const refreshed = await listProfiles();
      setProfiles(refreshed.profiles);
      setEditingId(id);
      setNotice('Saved.');
      navigate(`/capital/matches?profile_id=${id}`);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this company profile, its match history and its pipeline?')) return;
    try {
      await deleteProfile(id);
      const refreshed = await listProfiles();
      setProfiles(refreshed.profiles);
      if (editingId === id) reset();
    } catch (e) {
      setError(e.message);
    }
  }

  const v = meta?.vocab;
  const atProfileLimit = meta && !editingId && profiles.length >= meta.plan.limits.max_profiles;

  return (
    <section>
      <div className="page-header">
        <h1>Capital Access</h1>
        <p className="muted">
          Your company, in the terms investors actually filter on.
          {meta?.sources_loaded != null && ` Matched against ${meta.sources_loaded.toLocaleString()} capital sources.`}
        </p>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="ok">{notice}</div>}

      {profiles.length > 0 && (
        <div className="cap-profile-strip">
          {profiles.map((p) => (
            <div key={p.id} className={`cap-profile-chip ${editingId === p.id ? 'is-active' : ''}`}>
              <button className="link-btn" onClick={() => loadForEdit(p)}>{p.company_name}</button>
              <button className="link-btn" onClick={() => navigate(`/capital/matches?profile_id=${p.id}`)}>matches →</button>
              <button className="link-btn danger" onClick={() => onDelete(p.id)}>×</button>
            </div>
          ))}
          {!editingId || <button className="link-btn" onClick={reset}>+ new company</button>}
        </div>
      )}

      {atProfileLimit && (
        <div className="cap-gate">
          Your {meta.plan.label} plan covers {meta.plan.limits.max_profiles} company profile
          {meta.plan.limits.max_profiles === 1 ? '' : 's'}. Edit the existing one, or upgrade to add another.
        </div>
      )}

      <form className="cap-form" onSubmit={onSubmit}>
        <fieldset>
          <legend>The company</legend>
          <div className="cap-grid">
            <label className="field">
              <span>Company name *</span>
              <input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} required />
            </label>
            <label className="field">
              <span>Website</span>
              <input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
            </label>
          </div>
          <label className="field">
            <span>One line</span>
            <input
              value={form.one_liner || ''}
              onChange={(e) => set('one_liner', e.target.value)}
              placeholder="Embedded finance rails for GCC SMEs"
            />
            <small className="muted">Read by the AI relevance layer when scoring thesis fit.</small>
          </label>
          <label className="field">
            <span>What you do</span>
            <textarea rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
          </label>
        </fieldset>

        <fieldset>
          <legend>The raise — these are hard filters</legend>
          <p className="muted cap-legend-note">
            Leave one blank and it becomes "unknown" in your results: it can never score a ✓, and it
            lowers the confidence of every match.
          </p>
          <div className="cap-grid">
            <label className="field">
              <span>Stage</span>
              <select value={form.stage || ''} onChange={(e) => set('stage', e.target.value)}>
                <option value="">— unknown —</option>
                {(v?.stages || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Raising (USD)</span>
              <input
                type="number" min="0" step="1000"
                value={form.raise_usd}
                onChange={(e) => set('raise_usd', e.target.value)}
                placeholder="1500000"
              />
            </label>
            <label className="field">
              <span>Instrument</span>
              <select value={form.instrument || ''} onChange={(e) => set('instrument', e.target.value)}>
                <option value="">— unknown —</option>
                {(v?.instruments || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>HQ country (ISO2)</span>
              <input
                value={form.hq_country_iso2 || ''}
                maxLength={2}
                onChange={(e) => set('hq_country_iso2', e.target.value.toUpperCase())}
                placeholder="AE"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>What you are</legend>
          <div className="cap-grid">
            <label className="field">
              <span>Sector</span>
              <select value={form.sector || ''} onChange={(e) => set('sector', e.target.value)}>
                <option value="">— unknown —</option>
                {(v?.sectors || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Business model</span>
              <select value={form.business_model || ''} onChange={(e) => set('business_model', e.target.value)}>
                <option value="">— unknown —</option>
                {(v?.business_models || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Revenue (USD, annual)</span>
              <input
                type="number" min="0"
                value={form.revenue_usd}
                onChange={(e) => set('revenue_usd', e.target.value)}
                placeholder="0 if pre-revenue"
              />
            </label>
            <label className="field">
              <span>Relocate for a programme?</span>
              <select
                value={form.willing_to_relocate === null ? '' : String(form.willing_to_relocate)}
                onChange={(e) => set('willing_to_relocate',
                  e.target.value === '' ? null : e.target.value === 'true')}
              >
                <option value="">— unknown —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <CsvField
            label="Target markets"
            hint={`Blocs or ISO2 codes, comma separated. e.g. ${(v?.blocs || ['GCC', 'MENA']).slice(1, 4).join(', ')}`}
            value={form.target_markets}
            onChange={(val) => set('target_markets', val.map((s) => s.toUpperCase()))}
          />
          <CsvField
            label="Thesis keywords"
            hint="How an investor would describe what you do. e.g. embedded finance, SME tooling"
            value={form.keywords}
            onChange={(val) => set('keywords', val)}
          />
          <div className="field">
            <span>Founder attributes</span>
            <div className="cap-checks">
              {FOUNDER_ATTRS.map((a) => (
                <label key={a} className="cap-check">
                  <input
                    type="checkbox"
                    checked={form.founder_attributes.includes(a)}
                    onChange={() => toggleAttr(a)}
                  />
                  <span>{a}</span>
                </label>
              ))}
            </div>
            <small className="muted">Unlocks programmes that require them; never used to exclude you.</small>
          </div>
        </fieldset>

        <fieldset>
          <legend>Who you want (optional)</legend>
          <CsvField
            label="Investor types sought"
            hint="Leave blank to see every type. e.g. VC, Accelerator, Grant"
            value={form.investor_types_sought}
            onChange={(val) => set('investor_types_sought', val)}
          />
          <label className="field">
            <span>Traction</span>
            <input
              value={form.traction || ''}
              onChange={(e) => set('traction', e.target.value)}
              placeholder="e.g. $40k MRR, 1,200 SMEs, live in 2 markets"
            />
          </label>
        </fieldset>

        <div className="cap-form-actions">
          <button type="submit" className="btn-primary" disabled={saving || atProfileLimit}>
            {saving ? 'Saving…' : editingId ? 'Save and re-match' : 'Save and find capital'}
          </button>
          {editingId && <button type="button" className="link-btn" onClick={reset}>Start a new company</button>}
        </div>
      </form>
    </section>
  );
}
