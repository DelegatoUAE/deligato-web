import { useEffect, useState } from 'react';
import { loadPublicStats } from '../lib/publicStats';
import { Link } from 'react-router-dom';
import { Button, Icon } from '../design/ui';
import './landing.css';

// Public marketing page for signed-out visitors at "/".
// Copy rules (BUILD/product/positioning.md, IMPROVE.md): no outcome promises,
// no broker language, no banned strings (§3), no invented logos, testimonials or numbers.
// Stealth: the readiness method is not named here.

const TITLE = 'Deligato · Capital Access for founders';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POSITIONING_LINE = 'Understand your business. Become capital ready. Find the right capital. Get the right expertise. Execute the raise.';

// Copy: BUILD/product/improve-backlog.md, "Landing page spec (I-02)".
const STEPS = [
  { n: '01', icon: 'building', title: 'Tell us about your company.', body: 'About three minutes. You can change anything later.' },
  { n: '02', icon: 'gauge', title: 'See how investors are likely to read you.', body: 'A readiness score built on an established 14-question method, with the gaps worth closing first.' },
  { n: '03', icon: 'compass', title: 'Find which kinds of capital fit.', body: 'Venture, angels, grants, government programmes, venture debt, revenue-based finance, bank and working-capital finance, and more. 16 kinds of capital, checked before any investor list.' },
  { n: '04', icon: 'target', title: 'Get matches you can check.', body: "Every match shows what fits, what doesn't, and what we don't know yet." },
];

const PROVENANCE = ['Capital Provider Verified', 'Research Verified', 'Licensed Data Provider', 'Public Source', 'AI Inferred', 'Unknown'];

const EXPERTISE = ['Financial modelling', 'Fundraising preparation', 'Legal & cap table', 'Finance (fractional CFO)', 'Pitch & investor deck', 'Accounting & bookkeeping', 'Tax', 'Compliance & regulatory'];

const ROUTES_SME = ['Grants', 'Government programmes', 'Bank financing', 'Working-capital finance', 'Revenue-based finance', 'Venture debt', 'Equity'];

function Wordmark() {
  return (
    <Link to="/" className="lp-wordmark" aria-label="Deligato, Capital Access: home">
      <span className="lp-wordmark-name">Deligato</span>
      <span className="lp-wordmark-sub">Capital Access</span>
    </Link>
  );
}

function HeroIllustration() {
  // A labelled illustration of how one fit is explained. No provider name,
  // no score and no invented figures: only the product's own vocabulary.
  const rows = [
    { k: 'Geography', state: 'yes', src: 'Research Verified' },
    { k: 'Stage', state: 'yes', src: 'Capital Provider Verified' },
    { k: 'Sector', state: 'yes', src: 'Public Source' },
    { k: 'Ticket size', state: 'partial', src: 'Public Source' },
    { k: 'Instrument', state: 'unknown', src: 'Unknown' },
  ];
  const mark = { yes: 'Fits', partial: 'Partly fits', unknown: 'Not on record' };
  return (
    <figure className="lp-hero-card" aria-label="Illustration: how a capital provider fit is explained">
      <div className="lp-hero-card-head">
        <span className="lp-chip lp-chip-tier"><span className="lp-dot" aria-hidden="true" />Possible: insufficient evidence</span>
        <span className="lp-hero-card-tag">Illustration</span>
      </div>
      <p className="lp-hero-card-title">Why this provider appears for you</p>
      <ul className="lp-fit-list">
        {rows.map((r) => (
          <li key={r.k} className={`lp-fit lp-fit-${r.state}`}>
            <span className="lp-fit-mark" aria-hidden="true">{r.state === 'yes' ? '✓' : r.state === 'partial' ? '~' : '?'}</span>
            <span className="lp-fit-k">{r.k}</span>
            <span className="lp-fit-state">{mark[r.state]}</span>
            <span className="lp-fit-src">{r.src}</span>
          </li>
        ))}
      </ul>
      <figcaption className="lp-hero-card-foot">
        One criterion is not on record, so this provider stays under “Possible” until the evidence is there.
      </figcaption>
    </figure>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  useEffect(() => { document.title = TITLE; }, []);
  useEffect(() => {
    let live = true;
    loadPublicStats(API_URL).then((x) => { if (live) setStats(x); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const close = () => setMenuOpen(false);
  const asOf = stats ? new Date(`${stats.asOf}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null;

  return (
    <div className="lp">
      <a className="lp-skip" href="#main">Skip to content</a>
      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <Wordmark />
          <nav className={`lp-nav${menuOpen ? ' is-open' : ''}`} id="lp-nav" aria-label="Main">
            <a href="#how" onClick={close}>How it works</a>
            <a href="#smes" onClick={close}>For SMEs</a>
            <a href="#trust" onClick={close}>Trust</a>
            <Link to="/pricing" onClick={close}>Pricing</Link>
            <div className="lp-nav-cta">
              <Button as={Link} to="/login" variant="ghost" size="md" className="lp-signin">Sign in</Button>
              <Button as={Link} to="/signup" variant="primary" size="md">Create your account</Button>
            </div>
          </nav>
          <button type="button" className="lp-burger" aria-expanded={menuOpen} aria-controls="lp-nav" onClick={() => setMenuOpen((v) => !v)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
            <span className="ui-sr">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </header>

      <main id="main">
        <section className="lp-hero" aria-labelledby="lp-hero-h">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow lp-eyebrow-gold">Capital Access</p>
              <h1 id="lp-hero-h">Find the capital that fits your company, <span>and see the evidence for every match.</span></h1>
              <p className="lp-lede">{POSITIONING_LINE}</p>
              <div className="lp-cta-row">
                <Button as={Link} to="/signup" variant="accent" size="lg" iconRight="arrowRight">Create your account</Button>
                <Button as="a" href="#how" variant="secondary" size="lg" className="lp-btn-outline">See how matching works</Button>
              </div>
              <p className="lp-hero-note">We help you with fundraising. We never fundraise for you.</p>
            </div>
            <HeroIllustration />
          </div>
          {stats && (
            <div className="lp-wrap">
              <dl className="lp-proof" aria-label={`Deligato in numbers, as of ${asOf}`}>
                {stats.items.map((it) => (
                  <div key={it.key}><dt>{it.label}</dt><dd className="ui-num">{it.value.toLocaleString('en-US')}</dd></div>
                ))}
              </dl>
              <p className="lp-asof">As of {asOf}. Counted live from our research database.</p>
            </div>
          )}
        </section>

        <section id="how" className="lp-section" aria-labelledby="lp-how-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">How it works</p>
              <h2 id="lp-how-h">From your company to matches you can check</h2>
            </div>
            <ol className="lp-steps lp-steps-4">
              {STEPS.map((st) => (
                <li key={st.n} className="lp-step">
                  <div className="lp-step-top">
                    <span className="lp-step-icon" aria-hidden="true"><Icon name={st.icon} /></span>
                    <span className="lp-step-n" aria-hidden="true">{st.n}</span>
                  </div>
                  <h3>{st.title}</h3>
                  <p>{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="trust" className="lp-section lp-section-white" aria-labelledby="lp-trust-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Why founders trust it</p>
              <h2 id="lp-trust-h">Evidence first, and you stay in control</h2>
            </div>
            <div className="lp-trust lp-trust-3">
              <article className="lp-trust-card">
                <h3><Icon name="search" />Unknown is never a match.</h3>
                <p>If we don't know whether an investor accepts your stage or instrument, we say so. Missing data never counts in your favour.</p>
              </article>
              <article className="lp-trust-card">
                <h3><Icon name="layers" />Every fact has a source.</h3>
                <p>Each investor detail is labelled by where it came from and when it was last checked. AI-inferred details are never shown as verified.</p>
                <ul className="lp-prov-chips" aria-label="Source labels">
                  {PROVENANCE.map((l) => <li key={l} className={`lp-prov-label lp-prov-${l.split(' ')[0].toLowerCase()}`}>{l}</li>)}
                </ul>
              </article>
              <article className="lp-trust-card lp-trust-navy">
                <h3><Icon name="users" />You stay in control of every contact.</h3>
                <p>We draft; you decide, edit and send. Nothing is ever sent for you.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="smes" className="lp-section" aria-labelledby="lp-sme-h">
          <div className="lp-wrap lp-split">
            <div>
              <p className="lp-eyebrow">Not only venture capital</p>
              <h2 id="lp-sme-h">The right kind of capital comes first</h2>
              <p className="lp-section-sub lp-left">
                Most companies will never raise venture capital, and that's fine. We look at grants, government programmes, bank and working-capital finance, revenue-based finance and venture debt alongside equity, and tell you which ones fit before we show you a single provider.
              </p>
            </div>
            <div className="lp-expert-areas" aria-label="Kinds of capital we check">
              {ROUTES_SME.map((a) => <span key={a} className="lp-area">{a}</span>)}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section-white" aria-labelledby="lp-exp-h">
          <div className="lp-wrap lp-split">
            <div>
              <p className="lp-eyebrow">Expertise when you need it</p>
              <h2 id="lp-exp-h">A specialist for the gaps that need one</h2>
              <p className="lp-section-sub lp-left">
                Some gaps take a specialist. When your readiness shows one, we match you with experts in financial modelling, fundraising preparation, legal and cap-table work, and more. You agree scope directly with them.
              </p>
            </div>
            <div className="lp-expert-areas" aria-label="Expertise areas">
              {EXPERTISE.map((a) => <span key={a} className="lp-area">{a}</span>)}
            </div>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="lp-data-h">
          <div className="lp-wrap">
            <div className="lp-data">
              <span className="lp-feature-icon" aria-hidden="true"><Icon name="lock" /></span>
              <div>
                <h2 id="lp-data-h" className="lp-h3">Your data</h2>
                <p>Company facts only go to AI with your consent, never your name or contact details. Every AI request is logged where you can see it. Export or delete your data at any time.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-final" aria-labelledby="lp-final-h">
          <div className="lp-wrap lp-final-row">
            <div>
              <h2 id="lp-final-h">Start with your company. See what fits.</h2>
              <p>We help you with fundraising. We never fundraise for you.</p>
            </div>
            <div className="lp-cta-row">
              <Button as={Link} to="/signup" variant="accent" size="lg" iconRight="arrowRight">Create your account</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <Wordmark />
          <nav aria-label="Footer" className="lp-footer-nav">
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Sign in</Link>
          </nav>
        </div>
        <div className="lp-wrap lp-footer-legal">
          <p>© {new Date().getFullYear()} Deligato</p>
        </div>
      </footer>
    </div>
  );
}
