// Company Intelligence (api/modules/company-intel, mounted at /api/v1/company-intel).
// Contract: BUILD/release/hardening/day-2.md, section "CI-API" (api 04d2e20, faf5732).
// Every route is per company; 402 upgrade_required on CI-only routes, 503
// company_intel_unavailable before migration 016.
import { apiFetch } from './auth';

const base = (id) => `/api/v1/company-intel/${id}`;

export const getCommandCenter = (id) => apiFetch(`${base(id)}/command-center`);
export const getFinancialHealth = (id) => apiFetch(`${base(id)}/financial-health`);
export const getCompanyRecord = (id) => apiFetch(`${base(id)}/company-record`);
export const getCapitalTiming = (id, route) => apiFetch(`${base(id)}/capital-timing${route ? `?route=${encodeURIComponent(route)}` : ''}`);
export const getWhatChanged = (id, since) => apiFetch(`${base(id)}/what-changed${since ? `?since=${encodeURIComponent(since)}` : ''}`);
export const getAttention = (id) => apiFetch(`${base(id)}/attention`);
export const getReassessment = (id) => apiFetch(`${base(id)}/reassessment`);
export const getNextActions = (id) => apiFetch(`${base(id)}/next-actions`);
export const getNotifications = (id) => apiFetch(`${base(id)}/notifications`);
export const getCheckins = (id, months = 12) => apiFetch(`${base(id)}/check-ins?months=${months}`);
export const saveCheckin = (id, body) => apiFetch(`${base(id)}/check-ins`, { method: 'POST', body: JSON.stringify(body) });

/** 503 before 016 is applied: the screen falls back or says so, it never fakes data. */
export const isUnavailable = (e) => e?.status === 503 || e?.code === 'company_intel_unavailable';
