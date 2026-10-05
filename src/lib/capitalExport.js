// Capital Raising export and the monthly refresh note: PURE helpers (no fetch, no DOM).
// The API decides everything (entitlement, columns, contact masking, fair use); these only word
// and name what it returns.

import { fmtDate } from './format.js';

export const EXPORT_KINDS = ['matches', 'shortlist', 'pipeline'];
const BOM = '﻿';

/** True when the plan includes export (Capital Raising). Unknown entitlements: not shown. */
export const canExport = (ents) => Boolean(ents && ents.export === true);

/** True when the plan includes the monthly re-run (match_refresh other than 'none') and matching. */
export function hasMonthlyRefresh(ents) {
  if (!ents) return false;
  const mr = ents.max_results;
  const matching = mr === null || (Number.isInteger(mr) && mr > 0);
  return matching && Boolean(ents.match_refresh) && ents.match_refresh !== 'none';
}

/** API path for one export. */
export const exportPath = (companyId, kind) => `/api/v1/capital-export/${encodeURIComponent(companyId)}/${kind}.csv`;

/** "deligato-ledgerline-pipeline-2026-10-05.csv" */
export function exportFileName(kind, companyName, now = new Date()) {
  const slug = String(companyName || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 40);
  return ['deligato', slug, kind, now.toISOString().slice(0, 10)].filter(Boolean).join('-') + '.csv';
}

/** The browser's text decoder drops the byte-order mark; put it back so Excel reads UTF-8. */
export const withBom = (text) => (String(text || '').startsWith(BOM) ? String(text) : BOM + String(text || ''));

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** "Refreshed on 5 Nov 2026: 3 new fits, 1 removed" from GET /match-refresh/:id/latest, or null. */
export function refreshNote(refresh) {
  if (!refresh || !refresh.refreshed_at) return null;
  const c = refresh.counts || {};
  const parts = [];
  if (c.new_fits) parts.push(plural(c.new_fits, 'new fit', 'new fits'));
  if (c.removed) parts.push(`${c.removed} removed`);
  if (c.tier_changes) parts.push(`${c.tier_changes} changed fit`);
  return `Refreshed on ${fmtDate(refresh.refreshed_at)}: ${parts.length ? parts.join(', ') : 'no changes'}`;
}

/** The hover/second line: what the refresh is compared with. */
export function refreshDetail(refresh) {
  if (!refresh) return null;
  const since = refresh.previous_run_at ? ` Compared with your run on ${fmtDate(refresh.previous_run_at)}.` : '';
  return `Your matches are re-run automatically each month with your current details.${since}`;
}
