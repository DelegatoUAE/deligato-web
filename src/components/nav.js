// Navigation (D19): Home · Capital (primary) · Experts (secondary) · Company.
export const CAPITAL_NAV = [
  { id: 'cap-overview', label: 'Overview', href: '/capital', end: true, icon: 'gauge' },
  { id: 'cap-readiness', label: 'Readiness', href: '/capital/readiness', icon: 'target' },
  { id: 'cap-find', label: 'Find capital', href: '/capital/find', icon: 'search' },
  { id: 'cap-matches', label: 'My matches', href: '/capital/matches', icon: 'layers' },
  { id: 'cap-saved', label: 'Saved', href: '/capital/saved', icon: 'bell' },
  { id: 'cap-pipeline', label: 'Pipeline', href: '/capital/pipeline', icon: 'kanban' },
  { id: 'cap-dataroom', label: 'Data room', href: '/capital/data-room', icon: 'folder' },
];

export const EXPERT_NAV = [
  { id: 'exp-find', label: 'Find an expert', href: '/experts', end: true, icon: 'users' },
  { id: 'exp-mine', label: 'My experts', href: '/experts/mine', icon: 'check' },
  { id: 'exp-projects', label: 'Projects', href: '/experts/projects', icon: 'file' },
];

export const COMPANY_NAV = [
  { id: 'co-profile', label: 'Profile', href: '/company', end: true, icon: 'building' },
  { id: 'co-business', label: 'Business information', href: '/company/business', icon: 'chart' },
  { id: 'co-docs', label: 'Documents', href: '/company/documents', icon: 'file' },
];

/** In-page sub-navigation for each section (also the mobile route between pages). */
export const SUBNAV = {
  capital: [...CAPITAL_NAV, { id: 'cap-outreach', label: 'Outreach', href: '/capital/outreach' }, { id: 'cap-insights', label: 'Insights', href: '/capital/insights' }],
  experts: EXPERT_NAV,
  company: COMPANY_NAV,
};
