import { useEffect } from 'react';
import { PAGE_SUFFIX, POSITIONING } from '../lib/format';

/** Sign-in, sign-up and password screens: navy brand panel + form, Conncct design language. */
export default function AuthLayout({ title, subtitle, children }) {
  useEffect(() => { document.title = `${title} · ${PAGE_SUFFIX}`; }, [title]);
  return (
    <div className="login">
      <aside className="login-side ui-on-navy">
        <div>
          <div className="ui-wordmark">Deligato</div>
          <span className="ui-wordmark-sub">Capital Access</span>
        </div>
        <p className="login-line">{POSITIONING}</p>
        <p className="login-foot">We help you with fundraising. We never fundraise for you.</p>
      </aside>
      <main className="login-main">
        <div className="login-form">
          <h1>{title}</h1>
          {subtitle && <p className="login-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
