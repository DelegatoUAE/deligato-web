import { useState } from 'react';
import { Badge, Button, EmptyState, Input, PageHeader, Select, Table } from '../../design/ui';
import useApi from '../../lib/useApi';
import { COMPANY_FLAG_LABEL, URGENT_COMPANY_FLAGS, listPlatformCompanies } from '../../lib/admin';

const PAGE = 50;
const fmtUsd = (n) => (n == null ? '—' : n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : `$${Math.round(n / 1000)}k`);
const ago = (iso) => {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (Number.isNaN(d)) return '—';
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
};

/**
 * Admin · Companies. Every company on the platform, which Admin could not see
 * at all before. Ordered so the ones needing a human are readable at a glance:
 * the flags column is the reason this screen exists, not a decoration.
 * Oversight only — no founder documents, drafts or notes (api capital/admin.js).
 */
export default function AdminCompaniesPage() {
  const [f, setF] = useState({ q: '', stage: '', seeking: '', sort: 'last_activity' });
  const [offset, setOffset] = useState(0);
  const q = useApi(() => listPlatformCompanies({ ...f, limit: PAGE, offset }), [f.q, f.stage, f.seeking, f.sort, offset]);
  const set = (k) => (e) => { setOffset(0); setF((p) => ({ ...p, [k]: e.target.value })); };

  const rows = q.data?.companies || [];
  const total = q.data?.total ?? 0;
  const needing = rows.filter((c) => c.flags.length).length;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Companies"
        subtitle={q.data
          ? `${total} on the platform · ${needing} of the ${rows.length} shown need attention`
          : 'Every company on the platform.'}
      />

      <div className="ui-row admin-filters">
        <Input placeholder="Search name or account email" value={f.q} onChange={set('q')} aria-label="Search companies" />
        <Select value={f.stage} onChange={set('stage')} aria-label="Stage">
          <option value="">Any stage</option>
          {['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={f.seeking} onChange={set('seeking')} aria-label="Raise confirmed">
          <option value="">Everyone</option>
          <option value="true">Raise confirmed</option>
        </Select>
        <Select value={f.sort} onChange={set('sort')} aria-label="Sort">
          <option value="last_activity">Recently active</option>
          <option value="created">Newest</option>
          <option value="raise">Largest raise</option>
          <option value="name">Name</option>
        </Select>
      </div>

      {q.error && <EmptyState icon="alert" title="Companies couldn't be loaded." body={q.error.message} />}
      {!q.error && q.data && rows.length === 0 && (
        <EmptyState icon="search" title="No company matches that." body="Clear the filters to see everyone." />
      )}

      {!q.error && (q.loading || rows.length > 0) && (
        <Table
          rowKey="key"
          loading={q.loading}
          columns={[
            { key: 'name', header: 'Company' },
            { key: 'stage', header: 'Stage' },
            { key: 'country', header: 'Geo' },
            { key: 'readiness', header: 'Readiness' },
            { key: 'raise', header: 'Raise' },
            { key: 'journey', header: 'Journey' },
            { key: 'activity', header: 'Last active' },
            { key: 'flags', header: 'Needs attention' },
          ]}
          rows={rows.map((c) => ({
            key: c.id,
            name: (
              <div>
                <strong>{c.name}</strong>
                <div className="ui-faint ui-small">{c.owner.email || '—'}</div>
              </div>
            ),
            stage: c.stage || '—',
            country: c.country || '—',
            // Never invent a number: a company that was never assessed says so.
            readiness: c.readiness
              ? <span>{Math.round(c.readiness.score)} <span className="ui-faint ui-small">{c.readiness.band}</span></span>
              : <span className="ui-faint">Not assessed</span>,
            raise: c.capital_need_confirmed ? fmtUsd(c.raise_usd) : <span className="ui-faint">{fmtUsd(c.raise_usd)} draft</span>,
            journey: <span className="ui-small">{c.runs} run{c.runs === 1 ? '' : 's'} · {c.pipeline} shortlisted</span>,
            activity: <span className="ui-small">{ago(c.last_activity_at)}</span>,
            flags: c.flags.length === 0
              ? <span className="ui-faint">—</span>
              : (
                <div className="ui-row admin-flags">
                  {c.flags.map((x) => (
                    <Badge key={x} tone={URGENT_COMPANY_FLAGS.has(x) ? 'danger' : 'warn'}>
                      {COMPANY_FLAG_LABEL[x] || x}
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
