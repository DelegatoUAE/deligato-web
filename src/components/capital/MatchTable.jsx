import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FitMark, Icon } from '../../design/ui';
import MatchScore from './MatchScore';
import { FIT_DIMENSIONS, fitProvenance, investorHref, bucketHeadline, ticketRange, confidenceLevel, timingOf } from '../../lib/capital';
import { sortMatches, COMPARE_MAX } from '../../lib/matchview';
import { countryName } from '../../lib/format';

const SPOKEN = { yes: 'fits', partial: 'partly fits', no: 'does not fit', unknown: 'not on record' };
const norm = (s) => (['yes', 'partial', 'no', 'unknown'].includes(s) ? s : 'unknown');
const COLS = 7 + FIT_DIMENSIONS.length;
const BUCKET_TONE = { eligible: 'ok', possible: 'warn', likely_outside: 'bad' };
const BUCKET_HEAD = { eligible: 'Verified eligible', possible: 'Possible: insufficient evidence', likely_outside: 'Likely outside their mandate' };
const BUCKET_NOTE = { eligible: 'Every decisive fit rests on verified evidence.', possible: 'At least one decisive fact is unknown, which lowers the score.', likely_outside: "Their own criteria suggest they don't back companies like yours." };
const BUCKET_SHORT = { eligible: 'Verified eligible', possible: 'Possible', likely_outside: 'Likely outside' };
const CONF = { high: 'High', medium: 'Medium', low: 'Low' };

function SortHeader({ k, label, sort, onSort, align }) {
  const active = sort.key === k;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" aria-sort={ariaSort} className={align === 'right' ? 'is-num' : undefined}>
      <button type="button" className={`mt-sort${active ? ' is-active' : ''}`} onClick={() => onSort(k)}>
        {label}
        <span className="mt-sort-ic" aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

/** One fit cell: the four-state mark, with the D16 evidence label on hover, focus and for screen readers. */
function FitCell({ r, dim, label }) {
  const s = norm(r.fits?.[dim]);
  const prov = fitProvenance(r, dim);
  return (
    <td className="is-center">
      <span className="ui-tip mt-fit" data-tip={`${label}: ${SPOKEN[s]} · ${prov}`} tabIndex={0} aria-label={`${label}: ${SPOKEN[s]}. Evidence: ${prov}`}>
        <FitMark state={s} />
      </span>
    </td>
  );
}

/**
 * Dense, sortable matches table (the data-terminal view). Rows stay grouped by
 * evidence bucket; the chosen sort applies inside each bucket (D24).
 */
export default function MatchTable({ rows, runId, selected = [], onToggle }) {
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const sorted = useMemo(() => sortMatches(rows, sort.key, sort.dir), [rows, sort]);
  const onSort = (k) => setSort((s) => (s.key === k ? (s.dir === 'desc' ? { key: k, dir: 'asc' } : { key: null, dir: 'desc' }) : { key: k, dir: k === 'name' || k === 'type' || k === 'location' || k === 'deadline' ? 'asc' : 'desc' }));
  const full = selected.length >= COMPARE_MAX;

  return (
    <div className="ui-table-wrap mt-wrap">
      <table className="ui-table ui-table-dense mt">
        <caption className="ui-sr">Capital matches, grouped by evidence tier. Sorting applies inside each group.</caption>
        <thead>
          <tr>
            <th scope="col" className="mt-check"><span className="ui-sr">Compare</span></th>
            <SortHeader k="name" label="Capital provider" sort={sort} onSort={onSort} />
            <SortHeader k="score" label="Match" sort={sort} onSort={onSort} align="right" />
            <SortHeader k="confidence" label="Confidence" sort={sort} onSort={onSort} />
            <th scope="col">Evidence tier</th>
            {FIT_DIMENSIONS.map((d) => <SortHeader key={d.key} k={d.key} label={d.label} sort={sort} onSort={onSort} />)}
            <SortHeader k="ticket_size" label="Ticket size" sort={sort} onSort={onSort} align="right" />
            <SortHeader k="deadline" label="Timing" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const on = selected.includes(r.record_id);
            const newBucket = i === 0 || sorted[i - 1].bucket !== r.bucket;
            const conf = confidenceLevel(r.data_confidence);
            const groupN = newBucket ? sorted.filter((x) => x.bucket === r.bucket).length : 0;
            return (
              <Fragment key={r.record_id}>
              {newBucket && (
                <tr className="mt-group">
                  <th scope="rowgroup" colSpan={COLS}>
                    <span className={`mt-group-dot mt-tier-${BUCKET_TONE[r.bucket] || 'warn'}`} aria-hidden="true" />
                    {BUCKET_HEAD[r.bucket] || BUCKET_HEAD.possible} <span className="mt-group-n">{groupN}</span>
                    <span className="mt-group-note">{BUCKET_NOTE[r.bucket] || BUCKET_NOTE.possible}</span>
                  </th>
                </tr>
              )}
              <tr className={on ? 'is-selected' : undefined}>
                <td className="mt-check">
                  <input type="checkbox" checked={on} disabled={!on && full} onChange={() => onToggle?.(r.record_id)}
                    aria-label={on ? `Remove ${r.name} from compare` : `Add ${r.name} to compare`} title={!on && full ? `Compare up to ${COMPARE_MAX} at a time` : undefined} />
                </td>
                <td className="mt-name">
                  <Link to={investorHref(r.record_id, runId)} className="ui-cell-main">{r.name}</Link>
                  <div className="ui-cell-sub">{[r.type, [r.city, countryName(r.country)].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'Type and location not on record'}</div>
                </td>
                <td className="is-num"><MatchScore score={r.match_score} confidence={r.data_confidence} size="sm" /></td>
                <td><span className={`mt-conf mt-conf-${conf}`}>{CONF[conf]}</span></td>
                <td><span className={`mt-tier mt-tier-${BUCKET_TONE[r.bucket] || 'warn'}`} title={bucketHeadline(r)}>{BUCKET_SHORT[r.bucket] || 'Possible'}</span></td>
                {FIT_DIMENSIONS.map((d) => <FitCell key={d.key} r={r} dim={d.key} label={d.label} />)}
                <td className="is-num mt-nowrap">{(r.ticket_min_usd ?? r.ticket_max_usd) != null ? ticketRange(r.ticket_min_usd, r.ticket_max_usd) : <span className="ui-faint">Not on record</span>}</td>
                <td className="mt-nowrap">
                  {(() => { const t = timingOf(r); return !t ? <span className="ui-faint">None on record</span> : t.kind === 'open' ? <span className="mt-open"><Icon name="dot" />Open now</span> : t.text; })()}
                </td>
              </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
