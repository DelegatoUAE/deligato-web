import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Badge, ChipToggle, EmptyState, PageHeader, Table } from '../../design/ui';
import useApi from '../../lib/useApi';
import { RAISE_ISSUE_LABEL, URGENT_RAISE_ISSUES, listRaises } from '../../lib/admin';
import { AdminLoadError, Flags } from './adminBits';
import { ago, day, fmtUsd } from '../../lib/adminFormat';

const TIMING_WORD = { now: 'Now', '0_3m': '< 3 mo', '3_6m': '3–6 mo', '6_12m': '6–12 mo', exploring: 'Exploring' };

/**
 * Admin · Raises. Every company that is raising, by the same rule the
 * founder's Home uses, with the reasons a raise needs a human first: stalled
 * pipelines, passed target dates, short runways, nothing shortlisted.
 */
export default function AdminRaisesPage() {
  const navigate = useNavigate();
  const [issue, setIssue] = useState('');
  const q = useApi(() => listRaises({ issue }), [issue]);
  const d = q.data;
  const counts = d?.issues || {};

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Raises"
        subtitle={d ? `${d.total} compan${d.total === 1 ? 'y is' : 'ies are'} raising · ${d.needing_attention} need attention` : 'Every company actively raising.'}
      />
      {d && (
        <div className="admin-chips">
          <ChipToggle
            single
            label="Filter by issue"
            value={issue ? [issue] : []}
            onChange={(v) => setIssue(v[0] || '')}
            options={Object.entries(RAISE_ISSUE_LABEL).filter(([k]) => counts[k] > 0 || issue === k).map(([k, label]) => ({ key: k, label: `${label} (${counts[k] || 0})` }))}
          />
        </div>
      )}

      {q.error && <AdminLoadError error={q.error} what="Raises" />}
      {!q.error && d && d.items.length === 0 && (
        <EmptyState icon="target" title={issue ? 'No raise has that issue.' : 'No company is raising right now.'} body={issue ? 'Clear the filter to see every raise.' : 'A company appears here once its capital need is confirmed with a near timing, or it has an active pipeline.'} />
      )}
      {!q.error && (q.loading || d?.items.length > 0) && (
        <Table
          rowKey="key"
          loading={!d}
          onRowClick={(r) => navigate(`/admin/companies/${r.key}`)}
          columns={[
            { key: 'company', header: 'Company' },
            { key: 'raise', header: 'Raise' },
            { key: 'target', header: 'Target' },
            { key: 'readiness', header: 'Readiness' },
            { key: 'funnel', header: 'Matches → outcome' },
            { key: 'moved', header: 'Last movement' },
            { key: 'issues', header: 'Needs attention' },
          ]}
          rows={(d?.items || []).map((r) => ({
            key: r.company.id,
            company: <div><strong>{r.company.name}</strong><div className="ui-faint admin-small">{[r.company.stage, r.company.country].filter(Boolean).join(' · ') || '—'}</div></div>,
            raise: <div>{fmtUsd(r.raise_usd)}<div className="ui-faint admin-small">{[r.instrument, TIMING_WORD[r.raise_timing]].filter(Boolean).join(' · ') || '—'}</div></div>,
            target: r.target_funding_date
              ? <div>{day(r.target_funding_date)}<div className={`admin-small ${r.days_to_target < 0 ? 'admin-bad' : 'ui-faint'}`}>{r.days_to_target < 0 ? `${-r.days_to_target}d past` : `in ${r.days_to_target}d`}</div></div>
              : <span className="ui-faint">None given</span>,
            readiness: r.readiness ? <span>{Math.round(r.readiness.score)} <span className="ui-faint admin-small">{r.readiness.band}</span></span> : <span className="ui-faint">Not assessed</span>,
            funnel: (
              <span className="admin-raise-funnel admin-small" title="matches · shortlisted · contacted · in conversation · diligence · term sheet · closed">
                {r.funnel.matches ?? '—'} → {r.funnel.shortlisted} → {r.funnel.contacted} → {r.funnel.in_conversation} → {r.funnel.diligence} → {r.funnel.term_sheet} → <strong>{r.funnel.closed_won}</strong>
                {r.funnel.passed > 0 && <span className="ui-faint"> · {r.funnel.passed} passed</span>}
              </span>
            ),
            moved: <span className="admin-small">{r.last_movement_at ? ago(r.last_movement_at) : '—'}{r.idle > 0 && <> <Badge tone="bad" size="sm">{r.idle} idle</Badge></>}</span>,
            issues: <Flags items={r.issues} label={RAISE_ISSUE_LABEL} urgent={URGENT_RAISE_ISSUES} />,
          }))}
        />
      )}
      {d && <p className="ui-faint admin-note">Funnel: matches → shortlisted → contacted → in conversation → diligence → term sheet → closed. A pipeline is idle after {d.idle_after_days} days without movement in an active stage.</p>}
    </div>
  );
}
