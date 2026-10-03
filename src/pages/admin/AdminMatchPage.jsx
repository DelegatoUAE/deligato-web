import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Badge, Button, Card, EmptyState, FormField, PageHeader, Select, SkeletonCards, useToast } from '../../design/ui';
import { apiFetch } from '../../lib/auth';
import useApi from '../../lib/useApi';
import { AVAILABILITY, SENIORITY } from '../../lib/experts';

/** Staff · AI Match: rank the expert network against one project brief, then propose an allocation. */
export default function MatchPage() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [allocating, setAllocating] = useState({});
  const [allocatedFor, setAllocated] = useState({ id: null, map: {} });
  const selectedId = params.get('project_id') || '';
  const projectsQ = useApi(() => apiFetch('/projects').then((d) => d.projects || []), []);
  const matchQ = useApi(() => (selectedId ? apiFetch(`/projects/${selectedId}/matches`) : null), [selectedId]);
  const projects = projectsQ.data || [];
  const matches = selectedId ? matchQ.data?.matches ?? null : null;
  const project = selectedId ? matchQ.data?.project ?? null : null;
  const provider = matchQ.data?.provider || 'heuristic';
  const error = (projectsQ.error || matchQ.error)?.message || null;
  const allocated = allocatedFor.id === selectedId ? allocatedFor.map : {};

  async function onAllocate(consultantId, score) {
    setAllocating((s) => ({ ...s, [consultantId]: true }));
    try {
      await apiFetch('/allocations', { method: 'POST', body: JSON.stringify({ project_id: selectedId, consultant_id: consultantId, match_score: score, status: 'proposed' }) });
      setAllocated((s) => ({ id: selectedId, map: { ...(s.id === selectedId ? s.map : {}), [consultantId]: true } }));
      toast.success('Allocation proposed.');
    } catch (e) {
      toast.error(`Could not allocate: ${e.message}`);
    } finally {
      setAllocating((s) => ({ ...s, [consultantId]: false }));
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Admin" title="AI Match" subtitle="Pick a project to see experts ranked by fit, then propose an allocation." />
      <FormField label="Project">
        <Select value={selectedId} placeholder="Choose a project" onChange={(e) => { const n = new URLSearchParams(params); if (e.target.value) n.set('project_id', e.target.value); else n.delete('project_id'); setParams(n); }}
          options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.client_name}` }))} />
      </FormField>
      {error && <Alert tone="bad">{error}</Alert>}
      {!selectedId ? (
        <EmptyState icon="spark" title="Pick a project to see ranked experts." body="Ranking uses the project's skills and seniority." />
      ) : !matches ? <SkeletonCards count={3} height={110} /> : (
        <div className="ui-stack">
          {project && (
            <Card title={project.name} subtitle={`${project.client_name} · ${SENIORITY[project.required_seniority] || 'any seniority'}`}
              action={<Badge tone={provider === 'openai' ? 'gold' : 'outline'}>{provider === 'openai' ? 'AI-refined' : 'Rules-based'}</Badge>}>
              <div className="ui-tags">{(project.required_skills || []).map((s) => <span key={s} className="ui-tag">{s}</span>)}</div>
            </Card>
          )}
          {matches.map((m) => {
            const c = m.consultant;
            const av = AVAILABILITY[c.availability];
            return (
              <article key={c.id} className="xcard staff-match">
                <div className="xcard-top">
                  <Avatar name={c.full_name} size={44} />
                  <div className="xcard-id">
                    <h3>{c.full_name}</h3>
                    <p className="ui-muted">{[SENIORITY[c.seniority], c.location, c.daily_rate_gbp && `£${c.daily_rate_gbp}/day`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="xscore"><strong>{Math.round(m.match_score)}</strong><span>Expert fit</span></span>
                </div>
                <div className="ui-tags">{(c.skills || []).map((s) => <span key={s} className={`ui-tag${m.matched_skills?.includes(s.toLowerCase()) ? ' is-selected' : ''}`}>{s}</span>)}</div>
                {m.reasoning && <p className="xcard-why">{m.reasoning}</p>}
                <div className="xcard-foot">
                  {av && <Badge tone={av.tone} dot size="sm">{av.label}</Badge>}
                  {allocated[c.id] ? <Badge tone="ok">Allocation proposed</Badge>
                    : <Button size="sm" variant="primary" loading={allocating[c.id]} onClick={() => onAllocate(c.id, m.match_score)}>Propose allocation</Button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
