import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Avatar, Badge, Card, EmptyState, FormField, Input, PageHeader, Select, SkeletonCards } from '../design/ui';
import { apiFetch } from '../lib/auth';
import useApi from '../lib/useApi';
import { AVAILABILITY, SENIORITY } from '../lib/experts';

/** Staff · Expert admin: the full expert network, rates included (never shown to founders). */
export default function ConsultantsPage() {
  const [seniority, setSeniority] = useState('');
  const [availability, setAvailability] = useState('');
  const [skill, setSkill] = useState('');
  const q = useApi(() => {
    const p = new URLSearchParams();
    if (seniority) p.set('seniority', seniority);
    if (availability) p.set('availability', availability);
    if (skill.trim()) p.set('skill', skill.trim());
    return apiFetch(`/consultants${p.toString() ? `?${p}` : ''}`).then((d) => d.consultants || []);
  }, [seniority, availability, skill]);

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Expert admin" subtitle="Everyone in the expert network. Rates are visible to staff only." />
      <div className="ui-form ui-form-2 staff-filters">
        <FormField label="Skill"><Input type="search" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Financial model" /></FormField>
        <FormField label="Seniority"><Select value={seniority} onChange={(e) => setSeniority(e.target.value)} placeholder="Any" options={Object.entries(SENIORITY).map(([value, label]) => ({ value, label }))} /></FormField>
        <FormField label="Availability"><Select value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Any" options={Object.entries(AVAILABILITY).map(([value, v]) => ({ value, label: v.label }))} /></FormField>
      </div>
      {q.error && <Alert tone="bad">{q.error.message}</Alert>}
      {!q.data ? <SkeletonCards count={3} height={110} /> : q.data.length === 0 ? (
        <EmptyState icon="users" title="No experts match these filters." body="Clear a filter to see more." />
      ) : (
        <div className="ui-grid ui-grid-3">
          {q.data.map((c) => {
            const av = AVAILABILITY[c.availability];
            return (
              <Card key={c.id} interactive as={Link} to={`/workspace/experts/${c.id}`} className="staff-card">
                <div className="ui-who"><Avatar name={c.full_name} size={40} /><div className="ui-who-text"><span className="ui-who-name">{c.full_name}</span><span className="ui-who-sub">{[SENIORITY[c.seniority], c.location].filter(Boolean).join(' · ')}</span></div></div>
                <div className="ui-tags">{(c.skills || []).slice(0, 5).map((s) => <span key={s} className="ui-tag">{s}</span>)}</div>
                <div className="ui-row">{av && <Badge tone={av.tone} dot size="sm">{av.label}</Badge>}<span className="ui-muted">{c.daily_rate_gbp ? `£${c.daily_rate_gbp}/day` : 'Rate not set'}</span></div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
