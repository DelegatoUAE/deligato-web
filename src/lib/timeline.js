// Per-investor history in the pipeline drawer (UAT F04/F14, 5 Oct).
// The API (fundraising/crm.js `timeline`) answers { entries: [{ at, type, ... }] },
// newest first. Older shapes (`events`, `timeline`) are still read so the web
// never goes blank if the contract changes.
import { humanise } from './format.js';

const FIXED = {
  'pipeline.added': 'Added to your pipeline',
  'outreach.drafted': 'Draft prepared',
  'outreach.approved': 'Draft approved',
  'outreach.sent_by_founder': 'Marked as sent by you',
  'outreach.discarded': 'Draft discarded',
  'activity.completed': 'Task done',
  'outcome.replied': 'Reply logged',
  'outcome.meeting': 'Meeting logged',
  'outcome.contacted': 'Contacted',
  'outcome.viewed': 'Profile viewed',
  'outcome.saved': 'Saved',
};

export function rawEntries(data) {
  if (!data) return [];
  return data.entries || data.events || data.timeline || [];
}

function kindOf(e) {
  if (e.type) return e.type;
  if (e.event) return `outcome.${e.event}`;
  if (e.kind) return `activity.${e.kind}`;
  return '';
}

/** Readable, de-duplicated rows: [{ key, at, label, reason }]. */
export function timelineRows(data, { stageLabel = humanise } = {}) {
  const rows = [];
  const seen = new Set();
  for (const e of rawEntries(data)) {
    const t = kindOf(e);
    const at = e.at || e.occurred_at || e.created_at || null;
    let label;
    if (FIXED[t]) label = FIXED[t];
    else if (t === 'pipeline.stage_changed') label = e.from ? `Moved from ${stageLabel(e.from)} to ${stageLabel(e.to)}` : `Moved to ${stageLabel(e.to)}`;
    else if (t === 'pipeline.current_stage') label = `In ${stageLabel(e.stage)}`;
    else if (t.startsWith('activity.')) label = e.kind === 'meeting' ? 'Meeting logged' : (e.title || humanise(e.kind || t.slice(9)));
    else if (t.startsWith('outcome.')) label = humanise(e.event || t.slice(8));
    else label = humanise(t);
    // One meeting written as a CRM activity and an outcome (before 5 Oct) is one row.
    const minute = at ? String(at).slice(0, 16) : '';
    const dedupe = `${label}|${minute}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    rows.push({ key: e.event_id || e.activity_id || e.draft_id || `${t}-${at}-${rows.length}`, at, label, reason: e.reason || null });
  }
  return rows;
}
