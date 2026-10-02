// ============================================================
// Capital Access — web API client
//
// Deligato's CLAUDE.md says all network calls live in the lib layer and
// never inline in pages. `apiFetch` from auth.js stays the single network
// primitive (it owns the bearer token and error shape); this file is the
// Capital Access surface over it, kept separate so the module can be
// lifted into Conncct without dragging Deligato's auth file with it.
// ============================================================

import { apiFetch } from './auth';

// ---- meta -------------------------------------------------------
export function fetchCapitalMeta() {
  return apiFetch('/capital/meta');
}

// ---- founder profiles -------------------------------------------
export function listProfiles() {
  return apiFetch('/capital/profiles');
}

export function getProfile(id) {
  return apiFetch(`/capital/profiles/${id}`);
}

export function createProfile(fields) {
  return apiFetch('/capital/profiles', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

export function updateProfile(id, fields) {
  return apiFetch(`/capital/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteProfile(id) {
  return apiFetch(`/capital/profiles/${id}`, { method: 'DELETE' });
}

// ---- matching ---------------------------------------------------
export function runMatch(profileId, options = {}) {
  return apiFetch(`/capital/profiles/${profileId}/match`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export function previewMatch(founder) {
  return apiFetch('/capital/match/preview', {
    method: 'POST',
    body: JSON.stringify(founder),
  });
}

export function listRuns(profileId) {
  const q = profileId ? `?profile_id=${profileId}` : '';
  return apiFetch(`/capital/runs${q}`);
}

export function getRun(runId) {
  return apiFetch(`/capital/runs/${runId}`);
}

// ---- a single capital source ------------------------------------
export function getSource(recordId) {
  return apiFetch(`/capital/sources/${recordId}`);
}

// ---- pipeline ---------------------------------------------------
export function listPipeline(profileId) {
  const q = profileId ? `?profile_id=${profileId}` : '';
  return apiFetch(`/capital/pipeline${q}`);
}

export function addToPipeline({ profile_id, record_id, match_score_at_add, stage }) {
  return apiFetch('/capital/pipeline', {
    method: 'POST',
    body: JSON.stringify({ profile_id, record_id, match_score_at_add, stage }),
  });
}

export function updatePipelineItem(id, fields) {
  return apiFetch(`/capital/pipeline/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function removeFromPipeline(id) {
  return apiFetch(`/capital/pipeline/${id}`, { method: 'DELETE' });
}

// ---- shared display helpers -------------------------------------

export const PIPELINE_STAGES = [
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'researching', label: 'Researching' },
  { key: 'intro_requested', label: 'Intro requested' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'in_conversation', label: 'In conversation' },
  { key: 'diligence', label: 'Diligence' },
  { key: 'term_sheet', label: 'Term sheet' },
  { key: 'closed_won', label: 'Closed — won' },
  { key: 'passed', label: 'Passed' },
  { key: 'not_now', label: 'Not now' },
];

export function fmtUsd(n) {
  if (n === null || n === undefined || n === '') return null;
  const v = Number(n);
  if (!isFinite(v)) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
}

export function ticketRange(min, max) {
  const lo = fmtUsd(min);
  const hi = fmtUsd(max);
  if (lo && hi) return `${lo}–${hi}`;
  if (lo) return `from ${lo}`;
  if (hi) return `up to ${hi}`;
  return 'Cheque size unknown';
}
