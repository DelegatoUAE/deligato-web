import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';

const ROLE_LABEL = {
  project_manager: 'Project Manager',
  employee: 'Employee',
  finance: 'Finance',
  executive_hr: 'Executive / HR',
};

export default function Layout({ me, children }) {
  const navigate = useNavigate();
  const profile = me?.profile || {};

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">Deligato</div>
          <nav className="main-nav">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/consultants">Consultants</NavLink>
            <NavLink to="/match">AI Match</NavLink>
          </nav>
        </div>
        <div className="user-chip">
          <span>{profile.full_name || me?.user?.email}</span>
          <span className="role-pill">{ROLE_LABEL[profile.role] || profile.role}</span>
          <button className="link-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="content">
        {typeof children === 'function' ? children(me) : children}
      </main>
    </div>
  );
}
