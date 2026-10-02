import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Badge, Button, Icon, Select } from '../design/ui';
import { logout } from '../lib/auth';
import { useCompany } from './company-context';
import { ReadinessPill } from './capital/Readiness';
import AssistantPanel from './AssistantPanel';
import ErrorBoundary from './ErrorBoundary';
import { CAPITAL_NAV, EXPERT_NAV, COMPANY_NAV } from './nav';
import { PAGE_SUFFIX } from '../lib/format';

const TITLES = [
  [/^\/$/, 'Home'],
  [/^\/capital\/find/, 'Find capital'],
  [/^\/capital\/readiness/, 'Readiness'],
  [/^\/capital\/matches\/./, 'Capital provider'],
  [/^\/capital\/matches/, 'My matches'],
  [/^\/capital\/saved/, 'Saved'],
  [/^\/capital\/pipeline/, 'Pipeline'],
  [/^\/capital\/data-room/, 'Data room'],
  [/^\/capital\/outreach/, 'Outreach'],
  [/^\/capital\/insights/, 'Insights'],
  [/^\/capital\/improve/, 'Improve your matches'],
  [/^\/capital\/need/, 'Capital need'],
  [/^\/capital/, 'Capital'],
  [/^\/experts\/mine/, 'My experts'],
  [/^\/experts\/projects/, 'Projects'],
  [/^\/experts/, 'Experts'],
  [/^\/company\/business/, 'Business information'],
  [/^\/company\/documents/, 'Documents'],
  [/^\/company/, 'Company'],
  [/^\/packages/, 'Packages'],
  [/^\/settings/, 'Settings'],
  [/^\/welcome/, 'Welcome'],
  [/^\/onboarding/, 'Set up your company'],
  [/^\/dev/, 'Import a company (dev)'],
  [/^\/workspace/, 'Workspace'],
];
const titleFor = (path) => TITLES.find(([re]) => re.test(path))?.[1] || 'Capital Access';

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/capital', label: 'Capital', icon: 'gauge' },
  { to: '/experts', label: 'Experts', icon: 'users' },
  { to: '/company', label: 'Company', icon: 'building' },
];

export default function AppLayout({ children }) {
  const { me, staff, companies, company, setCompanyId, readiness, readinessLoading, plan, run, pipeline, dataRoom } = useCompany();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const title = titleFor(pathname);

  useEffect(() => { document.title = `${title} · ${PAGE_SUFFIX}`; }, [title]);

  const strong = run ? run.counts?.strong_fits ?? run.results.filter((r) => r.fit_tier === 'strong').length : null;
  const nav = [
    { items: [{ id: 'home', label: 'Home', icon: 'home', href: '/', end: true }] },
    { title: 'Capital', items: CAPITAL_NAV.map((i) => {
      const badge = {
        'cap-readiness': readiness?.readiness ? Math.round(Number(readiness.readiness.score)) : null,
        'cap-matches': strong || null,
        'cap-saved': pipeline ? pipeline.filter((p) => p.stage === 'shortlisted').length || null : null,
        'cap-pipeline': pipeline ? pipeline.filter((p) => ['researching', 'intro_requested', 'contacted', 'in_conversation', 'diligence', 'term_sheet'].includes(p.stage)).length || null : null,
        'cap-dataroom': dataRoom ? `${dataRoom.completeness_pct}%` : null,
      }[i.id];
      return badge != null ? { ...i, badge } : i;
    }) },
    { title: 'Experts', items: EXPERT_NAV },
    { title: 'Company', items: COMPANY_NAV },
  ];
  if (staff) {
    nav.push({
      title: 'Workspace',
      items: [
        { id: 'ws-experts', label: 'Expert admin', icon: 'users', href: '/workspace/experts' },
        { id: 'ws-projects', label: 'All projects', icon: 'file', href: '/experts/projects' },
        { id: 'ws-match', label: 'AI Match', icon: 'spark', href: '/workspace/match' },
        ...((import.meta.env.DEV && import.meta.env.VITE_DEV_IMPORT === 'true') ? [{ id: 'ws-import', label: 'Import (dev)', icon: 'download', href: '/dev/import' }] : []),
      ],
    });
  }
  nav.push({ items: [
    { id: 'ask-ai', label: 'Ask AI', icon: 'spark', onClick: () => setAssistantOpen(true) },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
  ] });

  const profile = me?.profile || {};
  const name = profile.full_name || me?.user?.email || 'You';

  function onLogout() {
    logout();
    navigate('/login');
  }

  const brand = (
    <div className="ui-shell-brand">
      <div>
        <div className="ui-wordmark">Deligato</div>
        <span className="ui-wordmark-sub">Capital Access</span>
      </div>
      {companies?.length > 1 && (
        <div className="coswitch">
          <label className="ui-sr" htmlFor="coswitch">Active company</label>
          <Select id="coswitch" value={company?.id || ''} onChange={(e) => setCompanyId(e.target.value)}
            options={companies.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
      )}
    </div>
  );

  return (
    <div className="applayout">
      <AppShell
        nav={nav}
        LinkComponent={NavLink}
        brand={brand}
        title={title}
        user={{ name, sub: [company?.name, plan?.label].filter(Boolean).join(' · ') }}
        footer={<Button variant="ghost" size="sm" iconLeft="logout" onClick={onLogout} className="signout">Sign out</Button>}
        topActions={(
          <>
            {company && !readinessLoading && <ReadinessPill readiness={readiness?.readiness} source={readiness} />}
            {plan && <Link to="/settings?tab=plan" className="planlink"><Badge tone="neutral">{plan.label}</Badge></Link>}
            <Button variant="secondary" size="sm" iconLeft="spark" onClick={() => setAssistantOpen(true)} aria-haspopup="dialog">Ask AI</Button>
          </>
        )}
      >
        <div className="page"><ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary></div>
      </AppShell>
      <nav className="tabbar" aria-label="Quick">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tabbar-item${isActive ? ' is-active' : ''}`}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <button type="button" className="tabbar-item" onClick={() => setAssistantOpen(true)} aria-haspopup="dialog">
          <Icon name="spark" />
          <span>AI</span>
        </button>
      </nav>
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
