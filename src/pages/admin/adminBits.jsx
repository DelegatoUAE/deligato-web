import { Badge, EmptyState } from '../../design/ui';
import { words } from '../../lib/adminFormat';

// Small shared pieces for the Admin oversight screens. Staff read these all
// day, so a missing value always says so ('—' or the reason), never 0.

export function Flags({ items = [], label = {}, urgent = new Set(), none = '—' }) {
  if (!items.length) return <span className="ui-faint">{none}</span>;
  return (
    <div className="ui-row admin-flags">
      {items.map((x) => <Badge key={x} tone={urgent.has(x) ? 'bad' : 'warn'}>{label[x] || words(x)}</Badge>)}
    </div>
  );
}

/** Key/value rows. A null value reads as the given `missing` text, never as 0. */
export function KV({ rows }) {
  return (
    <dl className="admin-kv">
      {rows.filter(Boolean).map(([k, v, missing = '—']) => (
        <div key={k}><dt>{k}</dt><dd>{v === null || v === undefined || v === '' ? <span className="ui-faint">{missing}</span> : v}</dd></div>
      ))}
    </dl>
  );
}

/**
 * A load failure, diagnosable by staff: the message, code and request id, never
 * the response body. 503 admin_audit_unavailable gets its own explanation,
 * because it is a deliberate refusal, not a fault.
 */
export function AdminLoadError({ error, what }) {
  if (error?.code === 'admin_audit_unavailable') {
    return (
      <EmptyState
        icon="lock"
        title={`${what} is switched off until access logging is on.`}
        body="Opening one customer's record is audited. This environment has not applied migration 020 yet, so the view is refused rather than served unaudited."
      />
    );
  }
  if (error?.status === 404) return <EmptyState icon="search" title={`${what} not found.`} body="It may have been removed, or the link is wrong." />;
  const rid = error?.body?.error?.request_id || error?.body?.request_id;
  return (
    <EmptyState
      icon="alert"
      title={`${what} couldn't be loaded.`}
      body={`${error?.message || 'Unknown error'}${error?.status ? ` · HTTP ${error.status}` : ''}${error?.code ? ` · ${error.code}` : ''}${rid ? ` · request ${rid}` : ''}`}
    />
  );
}
