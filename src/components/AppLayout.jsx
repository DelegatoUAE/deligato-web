import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Badge, Button, Icon, Select } from '../design/ui';
import { logout } from '../lib/auth';
import { useCompany } from './company-context';
import { ReadinessPill } from './capital/Readiness';
import AssistantPanel from './AssistantPanel';
import ThemeToggle from './ThemeToggle';
import ErrorBoundary from './ErrorBoundary';
import { CLIENT_NAV } from '../lib/portal';
import { tierLabel } from '../lib/plan';
import { PAGE_SUFFIX } from '../lib/format';
import { ASK_EVENT } from '../lib/ask';

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
  [/^\/company\/intelligence/, 'Company Intelligence'],
  [/^\/company\/financial-health/, 'Financial Health'],
  [/^\/company\/check-in/, 'Monthly check-in'],
  [/^\/company\/record/, 'Company Record'],
  [/^\/company\/business/, 'Business information'],
  [/^\/company\/documents/, 'Documents'],
  [/^\/company/, 'Company'],
  [/^\/packages/, 'Plans'],
  [/^\/settings/, 'Settings'],
  [/^\/welcome/, 'Welcome'],
  [/^\/onboarding/, 'Set up your company'],
  [/^\/dev/, 'Import a company (dev)'],
];
const titleFor = (path) => TITLES.find(([re]) => re.test(path))?.[1] || 'Capital Access';

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/company/intelligence', label: 'Company', icon: 'building' },
  { to: '/capital', label: 'Capital', icon: 'gauge' },
  { to: '/experts', label: 'Experts', icon: 'users' },
];

export default function AppLayout({ children }) {
  const { me, staff, companies, company, setCompanyId, readiness, readinessLoading, plan, entitlementsRaw, run, pipeline, dataRoom } = useCompany();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const title = titleFor(pathname);

  useEffect(() => { document.title = `${title} · ${PAGE_SUFFIX}`; }, [title]);
  useEffect(() => {
    const open = () => setAssistantOpen(true);
    window.addEventListener(ASK_EVENT, open);
    return () => window.removeEventListener(ASK_EVENT, open);
  }, []);

  // I-01: the nav badge is the verified-fit count, the same number as Home, Overview and Matches.
  const verified = run ? run.counts?.eligible_bucket ?? run.results.filter((r) => r.bucket === 'eligible').length : null;
  const badges = {
    'cap-readiness': readiness?.readiness ? Math.round(Number(readiness.readiness.score)) : null,
    'cap-matches': verified || null,
    'cap-saved': pipeline ? pipeline.filter((p) => p.stage === 'shortlisted').length || null : null,
    'cap-pipeline': pipeline ? pipeline.filter((p) => p.stage !== 'shortlisted').length || null : null,
    'cap-dataroom': dataRoom ? `${dataRoom.completeness_pct}%` : null,
  };
  // D58: the Client Portal navigation only. Admin has its own shell (AdminLayout).
  const nav = CLIENT_NAV.map((sec) => ({ ...sec, items: sec.items.map((i) => (badges[i.id] != null ? { ...i, badge: badges[i.id] } : i)) }));
  nav.push({ items: [
    { id: 'ask-ai', label: 'Ask AI', icon: 'spark', onClick: () => setAssistantOpen(true) },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
  ] });

  // I-09: while a founder sets up their company, the shell shows only Home and Settings.
  const settingUp = pathname.startsWith('/onboarding') || (!company && !staff);
  const shownNav = settingUp
    ? [{ items: [{ id: 'home', label: 'Home', icon: 'home', href: '/', end: true }, { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' }] }]
    : nav;

  // W4: the ladder tier names the plan, so a Company Intelligence subscriber is never labelled "Free".
  const planName = tierLabel(entitlementsRaw?.ladder_tier) || plan?.label || null;
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
        nav={shownNav}
        LinkComponent={NavLink}
        brand={brand}
        title={title}
        user={{ name, sub: [company?.name, planName].filter(Boolean).join(' · ') }}
        footer={(
          <>
            {staff && <Link to="/admin" className="portal-switch">Open the Admin portal</Link>}
            <Button variant="ghost" size="sm" iconLeft="logout" onClick={onLogout} className="signout">Sign out</Button>
          </>
        )}
        topActions={(
          <>
            {company && !readinessLoading && <ReadinessPill readiness={readiness?.readiness} source={readiness} />}
            {planName && <Link to="/settings/plan" className="planlink"><Badge tone="neutral">{planName}</Badge></Link>}
            <Button variant="secondary" size="sm" iconLeft="spark" onClick={() => setAssistantOpen(true)} aria-haspopup="dialog">Ask AI</Button>
            <ThemeToggle />
          </>
        )}
      >
        <div className="page"><ErrorBoundary resetKey={pathname} staff={staff === true}>{children}</ErrorBoundary></div>
      </AppShell>
      {!settingUp && <nav className="tabbar" aria-label="Quick">
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
      </nav>}
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
