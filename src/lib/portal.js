// Client Portal vs Admin Portal (D58). PURE: no imports, no React.
// Client-side gating is UX only; the API checks every permission (isAdmin,
// authorizeCompany). This decides which shell renders and what a founder sees.

/** Every admin path starts here. */
export const ADMIN_PREFIX = '/admin';

export const isAdminPath = (path) => path === ADMIN_PREFIX || String(path || '').startsWith(`${ADMIN_PREFIX}/`);

/**
 * What a signed-in user gets on a path.
 *   'admin'     the Admin Portal shell (staff only)
 *   'not_found' a founder on an admin path: the plain not-found page,
 *               no admin shell, no hint that the page exists
 *   'client'    the Client Portal shell
 */
export function portalFor(path, { staff = false } = {}) {
  if (isAdminPath(path)) return staff === true ? 'admin' : 'not_found';
  return 'client';
}

/**
 * The Client Portal navigation (D58): Home / Company / Capital / Experts / Ask AI / Settings.
 * Never carries an admin entry, whoever is signed in.
 */
export const CLIENT_NAV = [
  { items: [{ id: 'home', label: 'Home', icon: 'home', href: '/', end: true }] },
  {
    title: 'Company',
    items: [
      { id: 'co-intel', label: 'Company Intelligence', icon: 'spark', href: '/company/intelligence' },
      { id: 'co-health', label: 'Financial Health', icon: 'chart', href: '/company/financial-health' },
      { id: 'co-record', label: 'Company Record', icon: 'check', href: '/company/record' },
      { id: 'co-docs', label: 'Documents', icon: 'file', href: '/company/documents' },
      { id: 'co-profile', label: 'Profile', icon: 'building', href: '/company', end: true },
    ],
  },
  {
    title: 'Capital',
    items: [
      { id: 'cap-readiness', label: 'Capital Readiness', icon: 'target', href: '/capital/readiness' },
      { id: 'cap-find', label: 'Capital need and routes', icon: 'search', href: '/capital/find' },
      { id: 'cap-matches', label: 'Matches', icon: 'layers', href: '/capital/matches' },
      { id: 'cap-saved', label: 'Shortlist', icon: 'bell', href: '/capital/saved' },
      { id: 'cap-pipeline', label: 'Pipeline', icon: 'kanban', href: '/capital/pipeline' },
      { id: 'cap-dataroom', label: 'Data room', icon: 'folder', href: '/capital/data-room' },
    ],
  },
  { title: 'Experts', items: [{ id: 'exp-find', label: 'Experts', icon: 'users', href: '/experts' }] },
];

export const ADMIN_NAV = [
  {
    title: 'Admin',
    items: [
      { id: 'adm-home', label: 'Overview', icon: 'gauge', href: '/admin', end: true },
      { id: 'adm-companies', label: 'Companies', icon: 'building', href: '/admin/companies' },
      { id: 'adm-providers', label: 'Capital providers', icon: 'layers', href: '/admin/providers' },
      { id: 'adm-corrections', label: 'Corrections', icon: 'check', href: '/admin/corrections' },
      { id: 'adm-projects', label: 'Projects', icon: 'file', href: '/admin/projects' },
      { id: 'adm-experts', label: 'Experts', icon: 'users', href: '/admin/experts' },
      { id: 'adm-match', label: 'AI Match', icon: 'spark', href: '/admin/match' },
      { id: 'adm-learning', label: 'Learning', icon: 'chart', href: '/admin/learning' },
    ],
  },
];

/** Every href in a nav tree (used by tests and the shells). */
export const navHrefs = (nav) => nav.flatMap((s) => s.items.map((i) => i.href).filter(Boolean));

/** Settings tabs (D58 Settings), path form /settings/:tab so the assistant's routes resolve. */
export const SETTINGS_TABS = [
  { id: 'account', label: 'Account' },
  { id: 'plan', label: 'Plan and billing' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy and data' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
];
export function settingsTab(param, query) {
  const ids = SETTINGS_TABS.map((t) => t.id);
  if (ids.includes(param)) return param;
  if (ids.includes(query)) return query; // old ?tab= links keep working
  if (param === 'billing') return 'plan';
  return 'account';
}

/** Ask AI screen id per path (assistant contract, api modules/intelligence _assistant_intent.js SCREENS). */
export const SCREEN_IDS = [
  ['/company/financial-health', 'financial_health'],
  ['/company/check-in', 'financial_health'],
  ['/company/record', 'company_record'],
  ['/company/intelligence', 'company_intelligence'],
  ['/settings', 'settings'],
  ['/packages', 'billing'],
];
export function screenFor(path) {
  const p = String(path || '');
  const hit = SCREEN_IDS.find(([prefix]) => p === prefix || p.startsWith(`${prefix}/`));
  return hit ? hit[1] : null;
}
