import { useState } from 'react';
import { Alert, Avatar, Badge, Button, ConfirmDialog, EmptyState, FormField, Input, Modal, PageHeader, Select, Table, Textarea, useToast } from '../../design/ui';
import useApi from '../../lib/useApi';
import { createExpert, deleteExpert, listExperts, updateExpert } from '../../lib/admin';
import { AVAILABILITY, SENIORITY } from '../../lib/experts';

const EMPTY = { full_name: '', email: '', location: '', seniority: '', availability: 'available', daily_rate_gbp: '', skills: '', bio: '' };
const toForm = (c) => ({ ...EMPTY, ...c, daily_rate_gbp: c.daily_rate_gbp ?? '', skills: (c.skills || []).join(', '), bio: c.bio || '', email: c.email || '', location: c.location || '' });
const fmtRate = (n) => (n ? `£${Number(n).toLocaleString('en-GB')}/day` : 'Not set');

/** Admin · Experts: the expert network with full CRUD. Rates and emails are staff-only (the API strips them for founders). */
export default function AdminExpertsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ skill: '', seniority: '', availability: '' });
  const q = useApi(() => listExperts({ skill: filters.skill.trim(), seniority: filters.seniority, availability: filters.availability }), [filters.skill, filters.seniority, filters.availability]);
  const [edit, setEdit] = useState(null); // {id?, form}
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const setF = (k) => (e) => setEdit({ ...edit, form: { ...edit.form, [k]: e.target.value } });

  async function save() {
    const f = edit.form;
    const e = {};
    if (!f.full_name.trim()) e.full_name = 'Name is required.';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Check the email address.';
    if (f.daily_rate_gbp !== '' && !(Number(f.daily_rate_gbp) >= 0)) e.daily_rate_gbp = 'A number of pounds a day.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const body = {
      full_name: f.full_name.trim(), email: f.email.trim() || null, location: f.location.trim() || null,
      seniority: f.seniority || null, availability: f.availability || null, bio: f.bio.trim() || null,
      daily_rate_gbp: f.daily_rate_gbp === '' ? null : Number(f.daily_rate_gbp),
      skills: f.skills.split(',').map((x) => x.trim()).filter(Boolean),
    };
    setBusy(true);
    try {
      if (edit.id) await updateExpert(edit.id, body); else await createExpert(body);
      toast.success(edit.id ? `Saved ${body.full_name}.` : `Added ${body.full_name}.`);
      setEdit(null); q.reload();
    } catch (err) { setErrors({ form: err.message }); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await deleteExpert(removing.id); toast.success(`Removed ${removing.full_name}.`); setRemoving(null); q.reload(); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  const columns = [
    { key: 'full_name', header: 'Expert', render: (c) => <div className="ui-who"><Avatar name={c.full_name} size={32} /><div className="ui-who-text"><span className="ui-who-name">{c.full_name}</span><span className="ui-who-sub">{c.email || 'No email on record'}</span></div></div> },
    { key: 'seniority', header: 'Seniority', render: (c) => SENIORITY[c.seniority] || '–' },
    { key: 'location', header: 'Location', render: (c) => c.location || '–' },
    { key: 'availability', header: 'Availability', render: (c) => { const a = AVAILABILITY[c.availability]; return a ? <Badge tone={a.tone} dot size="sm">{a.label}</Badge> : '–'; } },
    { key: 'daily_rate_gbp', header: 'Rate (staff only)', numeric: true, render: (c) => fmtRate(c.daily_rate_gbp) },
    { key: 'skills', header: 'Skills', render: (c) => <div className="ui-tags">{(c.skills || []).slice(0, 3).map((s) => <span key={s} className="ui-tag">{s}</span>)}{(c.skills || []).length > 3 && <span className="ui-faint">+{c.skills.length - 3}</span>}</div> },
    { key: 'a', header: '', render: (c) => <div className="ui-row admin-row-actions"><Button size="sm" variant="secondary" onClick={() => { setErrors({}); setEdit({ id: c.id, form: toForm(c) }); }}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setRemoving(c)}>Remove</Button></div> },
  ];

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Experts" subtitle="The expert network founders are matched with. Rates and emails are visible to staff only."
        actions={<Button variant="primary" onClick={() => { setErrors({}); setEdit({ form: { ...EMPTY } }); }}>Add an expert</Button>} />
      <div className="ui-form ui-form-3 admin-filters">
        <FormField label="Skill"><Input type="search" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} placeholder="e.g. Financial model" /></FormField>
        <FormField label="Seniority"><Select value={filters.seniority} onChange={(e) => setFilters({ ...filters, seniority: e.target.value })} placeholder="Any" options={Object.entries(SENIORITY).map(([value, label]) => ({ value, label }))} /></FormField>
        <FormField label="Availability"><Select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })} placeholder="Any" options={Object.entries(AVAILABILITY).map(([value, v]) => ({ value, label: v.label }))} /></FormField>
      </div>
      {q.error && <Alert tone="bad">{q.error.message}</Alert>}
      <Table className="admin-table" columns={columns} rows={q.data || []} loading={!q.data && !q.error} rowKey="id"
        empty={<EmptyState compact icon="users" title="No experts match these filters." body="Clear a filter, or add an expert." />} />

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} size="lg" title={edit?.id ? `Edit ${edit.form.full_name || 'expert'}` : 'Add an expert'}
        description="Founders see the name, seniority, location, skills, availability and bio. Never the email or the rate."
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{edit?.id ? 'Save changes' : 'Add expert'}</Button></>}>
        {edit && (
          <div className="ui-form ui-form-2">
            <FormField label="Full name" required error={errors.full_name}><Input value={edit.form.full_name} onChange={setF('full_name')} /></FormField>
            <FormField label="Email" optional error={errors.email} hint="Staff only."><Input type="email" value={edit.form.email} onChange={setF('email')} /></FormField>
            <FormField label="Seniority" optional><Select value={edit.form.seniority} onChange={setF('seniority')} placeholder="Not set" options={Object.entries(SENIORITY).map(([value, label]) => ({ value, label }))} /></FormField>
            <FormField label="Availability"><Select value={edit.form.availability} onChange={setF('availability')} options={Object.entries(AVAILABILITY).map(([value, v]) => ({ value, label: v.label }))} /></FormField>
            <FormField label="Location" optional><Input value={edit.form.location} onChange={setF('location')} placeholder="City, country" /></FormField>
            <FormField label="Day rate" optional error={errors.daily_rate_gbp} hint="GBP. Staff only."><Input prefix="£" numeric value={edit.form.daily_rate_gbp} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, daily_rate_gbp: e.target.value.replace(/[^0-9.]/g, '') } })} /></FormField>
            <FormField label="Skills" optional wide hint="Comma-separated. Matching reads these."><Input value={edit.form.skills} onChange={setF('skills')} /></FormField>
            <FormField label="Bio" optional wide><Textarea rows={3} value={edit.form.bio} onChange={setF('bio')} /></FormField>
            {errors.form && <Alert tone="bad">{errors.form}</Alert>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={Boolean(removing)} title={`Remove ${removing?.full_name}?`} busy={busy}
        body="They disappear from founder matching. Projects and allocations that name them may lose the link. This can't be undone."
        confirmLabel="Remove expert" onConfirm={remove} onCancel={() => setRemoving(null)} />
    </div>
  );
}
