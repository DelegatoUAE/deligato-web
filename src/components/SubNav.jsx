import { NavLink } from 'react-router-dom';
import { SUBNAV } from './nav';

/** Section sub-navigation (D19): a quiet tab row above the page. */
export default function SubNav({ section }) {
  const items = SUBNAV[section] || [];
  return (
    <nav className={`subnav subnav-${section}`} aria-label={`${section} sections`}>
      {items.map((i) => (
        <NavLink key={i.id} to={i.href} end={i.end} className={({ isActive }) => `subnav-item${isActive ? ' is-active' : ''}`}>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
