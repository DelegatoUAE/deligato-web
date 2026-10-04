import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PAGE_SUFFIX } from '../lib/format';
import { Icon } from '../design/ui';
import ThemeToggle from './ThemeToggle';

// Light brand panel in the Conncct family style (Bilal's reference, 5 Oct 2026), Deligato copy.
const POINTS = [
  { icon: 'building', tone: 'gold', h: 'Understand your company', p: 'Financial health and readiness, judged on the right measures.' },
  { icon: 'compass', tone: 'blue', h: 'Find capital that fits', p: 'The right kind of capital first, then providers whose mandates fit.' },
  { icon: 'search', tone: 'green', h: 'Raise with evidence', p: 'Every match explained, with the source of every fact.' },
];

function Swoosh({ className }) {
  return (
    <svg className={className} viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M3 10 C 60 3, 140 1, 217 6" fill="none" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Sign-in, sign-up and password screens: light brand panel + form. */
export default function AuthLayout({ title, subtitle, children }) {
  useEffect(() => { document.title = `${title} · ${PAGE_SUFFIX}`; }, [title]);
  return (
    <div className="login">
      <aside className="login-side">
        <Link to="/" className="login-brand" aria-label="Deligato, Capital Intelligence: home">
          <span className="login-brand-name">Deligato</span>
          <span className="login-brand-sub">Capital Intelligence</span>
        </Link>
        <div className="login-pitch">
          <p className="login-eyebrow">For founders and growing companies</p>
          <p className="login-line">Your capital journey <span className="login-hl">starts here.<Swoosh className="login-swoosh" /></span></p>
          <p className="login-lede">Understand your company, become capital ready, and find the capital that fits, with the evidence for every match.</p>
          <ul className="login-points">
            {POINTS.map((x) => (
              <li key={x.h}>
                <span className={`login-ic login-ic-${x.tone}`} aria-hidden="true"><Icon name={x.icon} /></span>
                <span><b>{x.h}</b>{x.p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="login-script" aria-hidden="true">Evidence first.<br />Capital that fits.<Swoosh className="login-swoosh login-swoosh-sm" /></p>
        <div className="login-photo" aria-hidden="true"><img src="/img/auth-founders.jpg" width="1000" height="833" alt="" decoding="async" /></div>
      </aside>
      <main className="login-main">
        <div className="login-top">
          <Link to="/" className="login-back">← Back to home</Link>
          <ThemeToggle className="login-theme" />
        </div>
        <div className="login-form">
          <span className="login-bar" aria-hidden="true" />
          <h1>{title}</h1>
          {subtitle && <p className="login-sub">{subtitle}</p>}
          {children}
          <p className="login-secure"><Icon name="lock" />Your information is secure. We help you with fundraising. We never fundraise for you.</p>
        </div>
      </main>
    </div>
  );
}
