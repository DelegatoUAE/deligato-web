import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Badge, Button, Icon, Select } from '../design/ui';
import { logout } from '../lib/auth';
import { useCompany } from './company-context';
import { ReadinessPill } from './capital/Readiness';
import AssistantPanel from './AssistantPanel';
import { CAPITAL_NAV, EXPERT_NAV, COMPANY_NAV } from './nav';
import { PAGE_SUFFIX } from '../lib/format';

const TITLES = [
  [/^\/$/, 'Home'],
  [/^\/capital\/find/, 'Find capital'],
  [/^\/capital\/readiness/, 'Readiness'],
  [/^\/capital\/matches/, 'My matches'],
  [/^\/capital\/investors/, 'Investor'],
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
  [/^\/dev/, 'Import a company (dev)'],
  [/^\/workspace/, 'Workspace'],
];
const titleFor = (path) => TITLES.find(([re]) => re.test(path))?.[1] || 'Capital Access';

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/capital/find', label: 'Find', icon: 'search' },
  { to: '/capital/matches', label: 'Matches', icon: 'layers' },
  { to: '/capital/pipeline', label: 'Pipeline', icon: 'kanban' },
  { to: '/experts', label: 'Experts', icon: 'users' },
];

export default function AppLayout({ children }) {
  const { me, staff, companies, company, setCompanyId, readiness, plan, run } = useCompany();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const title = titleFor(pathname);

  useEffect(() => { document.title = `${title} · ${PAGE_SUFFIX}`; }, [title]);

  const strong = run ? run.results.filter((r) => r.fit_tier === 'strong').length : null;
  const nav = [
    { items: [{ id: 'home', label: 'Home', icon: 'home', href: '/', end: true }] },
    { title: 'Capital', items: CAPITAL_NAV.map((i) => (i.id === 'cap-matches' && strong ? { ...i, badge: strong } : i)) },
    { title: 'Experts', items: EXPERT_NAV },
    { title: 'Company', items: COMPANY_NAV },
  ];
  if (staff) {
    nav.push({
      title: 'Workspace',
      items: [
        { id: 'ws-consultants', label: 'Consultants admin', icon: 'users', href: '/workspace/consultants' },
        { id: 'ws-match', label: 'AI Match', icon: 'spark', href: '/workspace/match' },
        ...(import.meta.env.VITE_DEV_IMPORT === 'true' ? [{ id: 'ws-import', label: 'Import (dev)', icon: 'download', href: '/dev/import' }] : []),
      ],
    });
  }
  nav.push({ items: [{ id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' }] });

  const profile = me?.profile || {};
  const name = profile.full_name || me?.user?.email || 'You';

  function onLogout() {
    logout();
    navigate('/login');
  }

  const brand = (
    <div className="ui-shell-brand">
      <div>
        <div className="ui-wordmark">Conncct</div>
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
            <ReadinessPill readiness={readiness} />
            {plan && <Link to="/settings?tab=plan" className="planlink"><Badge tone="neutral">{plan.label}</Badge></Link>}
            <Button variant="secondary" size="sm" iconLeft="spark" onClick={() => setAssistantOpen(true)} aria-haspopup="dialog">Ask AI</Button>
          </>
        )}
      >
        <div className="page">{children}</div>
      </AppShell>
      <nav className="tabbar" aria-label="Quick">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tabbar-item${isActive ? ' is-active' : ''}`}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
