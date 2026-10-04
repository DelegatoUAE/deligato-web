import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState, Input, PageHeader, Select, Table } from '../../design/ui';
import useApi from '../../lib/useApi';
import { PROVIDER_ISSUE_LABEL, listPlatformProviders } from '../../lib/admin';

const PAGE = 50;
const fmtTicket = (t) => {
  const m = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : `$${Math.round(n / 1000)}k`);
  if (t.min_usd == null && t.max_usd == null) return <span className="ui-faint">Not recorded</span>;
  if (t.min_usd != null && t.max_usd != null) return `${m(t.min_usd)}–${m(t.max_usd)}`;
  return t.min_usd != null ? `from ${m(t.min_usd)}` : `up to ${m(t.max_usd)}`;
};
const freshness = (days) => {
  if (days == null) return <Badge tone="warn">Unknown</Badge>;
  if (days > 365) return <Badge tone="bad">{Math.floor(days / 30)}mo old</Badge>;
  if (days > 180) return <Badge tone="warn">{Math.floor(days / 30)}mo old</Badge>;
  return <span className="ui-small">{days}d</span>;
};

/**
 * Admin · Capital providers. The whole provider database, which Admin could
 * previously reach only through the expert AI-match screen.
 *
 * The exception filters are the point: "what is wrong with our data" is a
 * daily operational question, and a count of 4,013 answers none of it. A
 * provider's verification is shown as recorded — nothing here promotes an
 * inferred value to a verified one (D20).
 */
export default function AdminProvidersPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ q: '', type: '', status: '', exception: '', sort: 'name' });
  const [offset, setOffset] = useState(0);
  const filters = { q: f.q, type: f.type, status: f.status, sort: f.sort, limit: PAGE, offset };
  if (f.exception === 'unverified') filters.unverified = true;
  if (f.exception === 'stale') filters.stale = true;
  const q = useApi(() => listPlatformProviders(filters), [f.q, f.type, f.status, f.exception, f.sort, offset]);
  const set = (k) => (e) => { setOffset(0); setF((p) => ({ ...p, [k]: e.target.value })); };

  const rows = q.data?.providers || [];
  const total = q.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Capital providers"
        subtitle={q.data ? `${total} matching · the whole database, not only what matched someone` : 'The capital provider database.'}
      />

      <div className="ui-row admin-filters">
        <Input placeholder="Search name or alias" value={f.q} onChange={set('q')} aria-label="Search providers" />
        <Select value={f.type} onChange={set('type')} aria-label="Type">
          <option value="">Any type</option>
          {['VC', 'Angel', 'Accelerator', 'Bank', 'Grant', 'Family office', 'CVC'].map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={f.status} onChange={set('status')} aria-label="Status">
          <option value="">Any status</option>
          {['Active', 'Unverified', 'Closed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={f.exception} onChange={set('exception')} aria-label="Data quality">
          <option value="">All records</option>
          <option value="unverified">Needs verification</option>
          <option value="stale">Stale (over a year)</option>
        </Select>
        <Select value={f.sort} onChange={set('sort')} aria-label="Sort">
          <option value="name">Name</option>
          <option value="freshness">Freshest first</option>
          <option value="confidence">Most confident</option>
          <option value="verified">Recently verified</option>
        </Select>
      </div>

      {q.error && <EmptyState icon="alert" title="Providers couldn't be loaded." body={q.error.message} />}
      {!q.error && q.data && rows.length === 0 && (
        <EmptyState icon="search" title="No provider matches that." body="Clear the filters to see the whole database." />
      )}

      {!q.error && (q.loading || rows.length > 0) && (
        <Table
          rowKey="key"
          onRowClick={(r) => navigate(`/admin/providers/${encodeURIComponent(r.key)}`)}
          loading={q.loading}
          columns={[
            { key: 'name', header: 'Provider' },
            { key: 'type', header: 'Type' },
            { key: 'geo', header: 'Based' },
            { key: 'mandate', header: 'Mandate' },
            { key: 'ticket', header: 'Ticket' },
            { key: 'verification', header: 'Verification' },
            { key: 'fresh', header: 'Freshness' },
            { key: 'issues', header: 'Data issues' },
          ]}
          rows={rows.map((p) => ({
            key: p.record_id,
            name: (
              <div>
                <strong>{p.name}</strong>
                <div className="ui-faint ui-small">{p.record_id}{p.status && p.status !== 'Active' ? ` · ${p.status}` : ''}</div>
              </div>
            ),
            type: p.type || '—',
            geo: p.country_iso2 || p.country || '—',
            mandate: (
              <span className="ui-small">
                {p.stages.length ? `${p.stages.length} stage${p.stages.length === 1 ? '' : 's'}` : <span className="ui-faint">no stages</span>}
                {' · '}
                {p.sectors.length ? `${p.sectors.length} sector${p.sectors.length === 1 ? '' : 's'}` : <span className="ui-faint">no sectors</span>}
              </span>
            ),
            ticket: <span className="ui-small">{fmtTicket(p.ticket)}</span>,
            verification: p.verification.level
              ? <span className="ui-small">{p.verification.level}</span>
              : <span className="ui-faint">None</span>,
            fresh: freshness(p.freshness_days),
            issues: p.issues.length === 0
              ? <span className="ui-faint">—</span>
              : (
                <div className="ui-row admin-flags">
                  {p.issues.map((x) => (
                    <Badge key={x} tone={x === 'unverified' || x === 'stale' ? 'bad' : 'warn'}>
                      {PROVIDER_ISSUE_LABEL[x] || x}
                    </Badge>
                  ))}
                </div>
              ),
          }))}
        />
      )}

      {total > PAGE && (
        <div className="ui-row">
          <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
          <span className="ui-faint ui-small">{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
          <Button variant="secondary" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
        </div>
      )}
    </div>
  );
}
