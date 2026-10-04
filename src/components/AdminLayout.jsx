import { useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Button } from '../design/ui';
import ProtectedRoute from './ProtectedRoute';
import ThemeToggle from './ThemeToggle';
import ErrorBoundary from './ErrorBoundary';
import NotFoundPage from '../pages/NotFoundPage';
import { isStaff, logout } from '../lib/auth';
import { ADMIN_NAV, portalFor } from '../lib/portal';
import { PAGE_SUFFIX } from '../lib/format';

const TITLES = [
  [/^\/admin\/companies\/./, 'Company 360'], [/^\/admin\/companies/, 'Companies'],
  [/^\/admin\/providers\/./, 'Provider 360'], [/^\/admin\/providers/, 'Capital providers'],
  [/^\/admin\/raises/, 'Raises'], [/^\/admin\/matching/, 'Matching oversight'],
  [/^\/admin\/experts/, 'Experts'], [/^\/admin\/projects/, 'Projects'], [/^\/admin\/corrections/, 'Corrections'],
  [/^\/admin\/learning/, 'Learning'], [/^\/admin\/match/, 'AI Match'], [/^\/admin/, 'Overview'], [/^\/dev/, 'Import a company (dev)'],
];

/**
 * The Admin Portal shell (D58): its own entry, navigation and title, no client
 * navigation, no company context. A signed-in founder gets the plain
 * not-found page here, never the admin shell. UX only: the API checks
 * isAdmin on every admin call.
 */
function AdminShell({ me, children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] || 'Admin';
  useEffect(() => { document.title = `Admin · ${title} · ${PAGE_SUFFIX}`; }, [title]);
  const devImport = import.meta.env.DEV && import.meta.env.VITE_DEV_IMPORT === 'true';
  const nav = devImport
    ? [{ ...ADMIN_NAV[0], items: [...ADMIN_NAV[0].items, { id: 'ws-import', label: 'Import (dev)', icon: 'download', href: '/dev/import' }] }]
    : ADMIN_NAV;
  return (
    <div className="applayout adminlayout">
      <AppShell
        nav={nav}
        LinkComponent={NavLink}
        productName="Admin portal"
        title={`Admin · ${title}`}
        user={{ name: me?.profile?.full_name || me?.user?.email || 'Staff', sub: 'Conncct staff' }}
        footer={(
          <>
            <Link to="/" className="portal-switch">Back to the client portal</Link>
            <Button variant="ghost" size="sm" iconLeft="logout" onClick={() => { logout(); navigate('/login'); }} className="signout">Sign out</Button>
          </>
        )}
        topActions={<ThemeToggle />}
      >
        <div className="page"><ErrorBoundary resetKey={pathname} staff={isStaff(me)}>{children}</ErrorBoundary></div>
      </AppShell>
    </div>
  );
}

function Gate({ me, children }) {
  const { pathname } = useLocation();
  const portal = portalFor(pathname.startsWith('/dev') ? '/admin' : pathname, { staff: isStaff(me) });
  if (portal !== 'admin') return <NotFoundPage />;
  return <AdminShell me={me}>{children}</AdminShell>;
}

/** Wraps every admin route in App.jsx. */
export function AdminArea({ children }) {
  return <ProtectedRoute>{(me) => <Gate me={me}>{children}</Gate>}</ProtectedRoute>;
}

export default AdminArea;
