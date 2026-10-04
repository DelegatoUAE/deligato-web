import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Badge, Button, Card, ChipToggle, EmptyState, PageHeader, Table } from '../../design/ui';
import useApi from '../../lib/useApi';
import { BUCKET_LABEL, TIER_LABEL, getMatchingOversight } from '../../lib/admin';
import { AdminLoadError } from './adminBits';
import { ago, words } from '../../lib/adminFormat';

const PAGE = 50;
// An engine invariant breaking is worse than weak data, which is worse than a closed provider.
const URGENT = new Set(['tier_above_lead_outside_mandate', 'high_score_weak_evidence', 'negative_feedback']);

/**
 * Admin · Matching oversight. The stored output of the ONE matching engine,
 * checked for what should worry a human: a broken engine invariant, high scores on thin data, founders marking a match wrong. Each row
 * links to the company and the provider. Read-only: there is nothing here to
 * change the methodology with, on purpose.
 */
export default function AdminMatchingPage() {
  const [anomaly, setAnomaly] = useState('');
  const [offset, setOffset] = useState(0);
  const q = useApi(() => getMatchingOversight({ anomaly, limit: PAGE, offset }), [anomaly, offset]);
  const d = q.data;
  const label = Object.fromEntries((d?.anomalies || []).map((a) => [a.key, a.label]));
  const flagged = d ? d.anomalies.reduce((s, a) => s + a.count, 0) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Matching oversight"
        subtitle={d ? `${d.totals.results} results across ${d.totals.companies} compan${d.totals.companies === 1 ? 'y' : 'ies'} (latest runs) · ${flagged} anomal${flagged === 1 ? 'y' : 'ies'}` : 'Anomalies in what the matching engine returned.'}
      />
      {d && (
        <div className="admin-chips">
          <ChipToggle
            single
            label="Filter by anomaly"
            value={anomaly ? [anomaly] : []}
            onChange={(v) => { setOffset(0); setAnomaly(v[0] || ''); }}
            options={d.anomalies.filter((a) => a.count > 0 || a.key === anomaly).map((a) => ({ key: a.key, label: `${a.label} (${a.count})` }))}
          />
        </div>
      )}

      {q.error && <AdminLoadError error={q.error} what="Matching oversight" />}
      {!q.error && d && d.items.length === 0 && (
        <EmptyState icon="check" title={anomaly ? 'Nothing with that anomaly.' : 'No anomalies in the latest runs.'} body="Every stored result is consistent and evidenced well enough not to need a human." />
      )}
      {!q.error && (!d || d.items.length > 0) && (
        <Table
          rowKey="key"
          loading={!d}
          columns={[
            { key: 'pair', header: 'Company → provider' },
            { key: 'verdict', header: 'Eligibility · fit' },
            { key: 'score', header: 'Score', numeric: true },
            { key: 'data', header: 'Data' },
            { key: 'why', header: 'Why matched' },
            { key: 'run', header: 'Run' },
            { key: 'anomalies', header: 'Anomaly' },
          ]}
          rows={(d?.items || []).map((x) => ({
            key: `${x.run.id}:${x.provider.record_id}`,
            pair: (
              <div>
                <Link to={`/admin/companies/${x.company.id}`}><strong>{x.company.name || 'Unnamed company'}</strong></Link>
                <div className="admin-small">→ <Link to={`/admin/providers/${encodeURIComponent(x.provider.record_id)}`}>{x.provider.name || x.provider.record_id}</Link>
                  {x.provider.status && x.provider.status !== 'Active' && <> <Badge tone="bad" size="sm">{x.provider.status}</Badge></>}
                </div>
              </div>
            ),
            verdict: (
              <div className="admin-small">
                {x.bucket ? BUCKET_LABEL[x.bucket] : <span className="ui-faint">No bucket</span>}
                <div>{x.fit_tier ? TIER_LABEL[x.fit_tier] : <span className="ui-faint">No tier</span>} <span className="ui-faint">· #{x.rank}</span></div>
              </div>
            ),
            score: x.match_score ?? '—',
            data: (
              <div className="admin-small">
                {x.confidence.band || '—'}{x.confidence.unknown_count ? ` · ${x.confidence.unknown_count} unknown` : ''}
                <div className="ui-faint">{x.provider.verification || 'Unverified'}</div>
              </div>
            ),
            why: <span className="admin-small admin-clamp" title={x.why_matched || ''}>{x.why_matched || <span className="ui-faint">Not stored</span>}{x.last_outcome && <span className="ui-faint"> · last outcome: {words(x.last_outcome).toLowerCase()}</span>}</span>,
            run: <div className="admin-small">{ago(x.run.at)}<div className="ui-faint">{x.run.engine_version || 'version not recorded'}</div></div>,
            anomalies: (
              <div className="ui-row admin-flags">
                {x.anomalies.map((a) => <Badge key={a} size="sm" tone={URGENT.has(a) ? 'bad' : 'warn'} title={label[a]}>{words(a)}</Badge>)}
              </div>
            ),
          }))}
        />
      )}
      {d && (d.items.length === PAGE || offset > 0) && (
        <div className="ui-row">
          <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
          <Button variant="secondary" disabled={d.items.length < PAGE} onClick={() => setOffset(offset + PAGE)}>Next</Button>
        </div>
      )}

      {d && (
        <Card title="Recent match runs" subtitle="The 20 most recent runs on the platform, with the engine version and ranker that produced them." className="admin-360-section">
          <Table
            dense
            rowKey="key"
            columns={[
              { key: 'company', header: 'Company' },
              { key: 'at', header: 'When' },
              { key: 'engine', header: 'Engine' },
              { key: 'ranker', header: 'Ranker' },
              { key: 'out', header: 'Returned · eligible', numeric: true },
            ]}
            rows={d.recent_runs.map((r) => ({
              key: r.id,
              company: <Link to={`/admin/companies/${r.company.id}`}>{r.company.name || 'Unnamed company'}</Link>,
              at: <span className="admin-small">{ago(r.at)}</span>,
              engine: <span className="admin-small">{r.engine_version || <span className="ui-faint">Not recorded</span>}</span>,
              ranker: <span className="admin-small">{r.provider}{r.ai_model ? ` · ${r.ai_model}` : ''}{r.ai_failed && <> <Badge tone="bad" size="sm">AI failed</Badge></>}</span>,
              out: `${r.returned ?? '—'} · ${r.eligible ?? '—'}`,
            }))}
          />
        </Card>
      )}
    </div>
  );
}
