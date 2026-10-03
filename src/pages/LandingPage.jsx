import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon } from '../design/ui';
import './landing.css';

// Public marketing page for signed-out visitors at "/".
// Copy rules (BUILD/product/positioning.md, IMPROVE.md): no outcome promises,
// no broker language, no banned strings (§3), no invented logos, testimonials or numbers.
// Stealth: the readiness method is not named here.

const TITLE = 'Deligato · Capital Access for founders';

// Static and conservative. /health/capital only reports counts with the
// health token, so the public page shows the floor of the loaded total
// (3,984 records on 3 Oct 2026, BUILD/release/LIVE.md).
const PROVIDERS_ON_RECORD = '3,900+';

const STEPS = [
  { n: '01', icon: 'gauge', title: 'Readiness', body: 'Answer a structured readiness assessment. See your band, what is strong, and the few gaps that matter most to capital providers.' },
  { n: '02', icon: 'compass', title: 'Routing', body: 'Find out which kinds of capital fit your company today, from venture capital and angels to grants, venture debt and revenue-based finance.' },
  { n: '03', icon: 'target', title: 'Matching', body: 'Get capital providers whose mandates fit yours, sorted by how strong the evidence is. Every fit shows where the fact came from.' },
  { n: '04', icon: 'send', title: 'Outreach', body: 'Prepare tailored drafts for the providers you choose. You copy them or open them in your own email. Nothing is sent for you.' },
  { n: '05', icon: 'kanban', title: 'Pipeline', body: 'Track every conversation by stage, keep your data room in order, and learn from outcomes as your raise moves.' },
];

const CAPITAL = [
  { icon: 'layers', title: 'Three evidence tiers', body: 'Verified eligible, Possible with insufficient evidence, and Likely outside mandate. A thin result is shown as thin, never padded.' },
  { icon: 'file', title: 'Profiles with sources', body: 'Stage, sector, geography, ticket and instrument, each labelled with its provenance. Unknown is shown as unknown.' },
  { icon: 'compass', title: '16 capital routes', body: 'Equity, debt, non-dilutive and alternative routes, explained against your stage, traction and capital need.' },
  { icon: 'folder', title: 'Data room checklist', body: 'Know which documents providers expect at your stage and keep them in one place, ready to share when you decide.' },
  { icon: 'send', title: 'Draft-only outreach', body: 'Tailored first notes and follow-ups you edit, copy and send yourself, then mark as sent.' },
  { icon: 'chart', title: 'Pipeline and insights', body: 'Stages, next steps and outcomes in one view, with insights on what is working in your raise.' },
];

const PROVENANCE = [
  { label: 'Capital Provider Verified', note: 'Confirmed by the provider' },
  { label: 'Research Verified', note: 'Checked by our research team' },
  { label: 'Licensed Data Provider', note: 'From a licensed data source' },
  { label: 'Public Source', note: 'From a public source we cite' },
  { label: 'AI Inferred', note: 'Never presented as verified' },
  { label: 'Unknown', note: 'Never counted as a match' },
];

const FAQ = [
  { q: 'Do you raise capital for me?', a: 'No. We help you with fundraising. We never fundraise for you. Deligato helps you prepare, find the providers that fit, and organise your raise. You decide who to contact, and you send every message yourself.' },
  { q: 'Do you contact investors on my behalf?', a: 'Never. Outreach in Deligato is draft-only. You copy a draft or open it in your own email app, and mark it as sent when you have sent it.' },
  { q: 'How are matches decided?', a: 'We compare your company and capital need with each provider’s mandate: geography, stage, sector, ticket, instrument and traction. Results are grouped by evidence tier, and each criterion shows whether it fits and the source behind it. A match is a fit, not an offer.' },
  { q: 'What does “Verified eligible” mean?', a: 'Every decisive criterion fits and is backed by verified evidence. When the evidence is incomplete, the provider appears under “Possible” instead, with the missing facts listed. Unknown details never add to a match.' },
  { q: 'Where does the capital provider data come from?', a: 'From our research database of capital provider records. Every field carries a provenance label, so you can see whether it was confirmed by the provider, checked by our research team, taken from a licensed or public source, or inferred by AI.' },
  { q: 'How is my company data used?', a: 'To assess your readiness and match your company. You decide in Settings how AI may process it, you can see the AI calls made for your account, and you can export or delete your data at any time. Capital providers do not see your company data.' },
  { q: 'What does it cost to start?', a: 'Creating an account is free. The free tier includes your readiness view, capital routes and your first matches. Paid packages add more matches, full provider profiles, outreach drafts and expert support. You choose if and when to upgrade.' },
];

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

function FaqItem({ q, a }) {
  return (
    <details className="lp-faq-item">
      <summary><span>{q}</span><Icon name="plus" /></summary>
      <p>{a}</p>
    </details>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = TITLE; }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const close = () => setMenuOpen(false);

  return (
    <div className="lp">
      <a className="lp-skip" href="#main">Skip to content</a>
      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <Wordmark />
          <nav className={`lp-nav${menuOpen ? ' is-open' : ''}`} id="lp-nav" aria-label="Main">
            <a href="#how" onClick={close}>How it works</a>
            <a href="#capital" onClick={close}>Capital Access</a>
            <a href="#experts" onClick={close}>Expert Access</a>
            <a href="#trust" onClick={close}>Trust</a>
            <a href="#faq" onClick={close}>FAQ</a>
            <div className="lp-nav-cta">
              <Button as={Link} to="/login" variant="ghost" size="md" className="lp-signin">Sign in</Button>
              <Button as={Link} to="/signup" variant="primary" size="md">Create your free account</Button>
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
              <p className="lp-eyebrow lp-eyebrow-gold">Capital Access for founders</p>
              <h1 id="lp-hero-h">Find the capital that fits your company. <span>And see the evidence behind every match.</span></h1>
              <p className="lp-lede">
                Deligato shows how ready you are to raise, which kinds of capital fit you, and which providers’ mandates match yours, with the source of every fact.
                Then it helps you run the raise. You stay in control of every contact.
              </p>
              <div className="lp-cta-row">
                <Button as={Link} to="/signup" variant="accent" size="lg" iconRight="arrowRight">Create your free account</Button>
                <Button as={Link} to="/login" variant="secondary" size="lg" className="lp-btn-outline">Sign in</Button>
              </div>
              <p className="lp-hero-note">We help you with fundraising. We never fundraise for you.</p>
            </div>
            <HeroIllustration />
          </div>
          <div className="lp-wrap">
            <dl className="lp-proof" aria-label="Deligato in numbers">
              <div><dt>Capital provider records in our research database</dt><dd className="ui-num">{PROVIDERS_ON_RECORD}</dd></div>
              <div><dt>Capital routes, from equity to debt and grants</dt><dd className="ui-num">16</dd></div>
              <div><dt>Evidence tiers for every match</dt><dd className="ui-num">3</dd></div>
              <div><dt>Messages sent on your behalf</dt><dd className="ui-num">0</dd></div>
            </dl>
          </div>
        </section>

        <section id="how" className="lp-section" aria-labelledby="lp-how-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">How it works</p>
              <h2 id="lp-how-h">From “are we ready?” to a raise you run with confidence</h2>
              <p className="lp-section-sub">Five steps, in the order founders actually need them.</p>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s) => (
                <li key={s.n} className="lp-step">
                  <div className="lp-step-top">
                    <span className="lp-step-icon" aria-hidden="true"><Icon name={s.icon} /></span>
                    <span className="lp-step-n" aria-hidden="true">{s.n}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="capital" className="lp-section lp-section-white" aria-labelledby="lp-cap-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Capital Access</p>
              <h2 id="lp-cap-h">Capital provider data you can check, not just trust</h2>
              <p className="lp-section-sub">Depth on every provider, honesty about what is not known, and the tools to act on it.</p>
            </div>
            <div className="lp-features">
              {CAPITAL.map((f) => (
                <article key={f.title} className="lp-feature">
                  <span className="lp-feature-icon" aria-hidden="true"><Icon name={f.icon} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="experts" className="lp-section" aria-labelledby="lp-exp-h">
          <div className="lp-wrap lp-split">
            <div>
              <p className="lp-eyebrow">Expert Access</p>
              <h2 id="lp-exp-h">Close the gaps that hold your raise back</h2>
              <p className="lp-section-sub lp-left">
                When readiness or a match shows a gap, find an expert matched to that exact need: a fractional CFO for the model, legal help on the cap table, a fundraising advisor for the deck.
              </p>
              <ul className="lp-ticks">
                <li><Icon name="check" />Matched to the gap, with the reasons shown</li>
                <li><Icon name="check" />Request a conversation inside the platform</li>
                <li><Icon name="check" />Scope and price agreed directly with the expert</li>
              </ul>
            </div>
            <div className="lp-expert-areas" aria-label="Expertise areas">
              {['Finance (fractional CFO)', 'Fundraising', 'Pitch & investor deck', 'Financial modelling', 'Legal & cap table', 'Accounting & bookkeeping', 'Tax', 'Strategy', 'Compliance & regulatory', 'Marketing & growth', 'Technology & engineering', 'AI & machine learning', 'Product', 'Operations'].map((a) => (
                <span key={a} className="lp-area">{a}</span>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="lp-section lp-section-white" aria-labelledby="lp-trust-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Why founders trust it</p>
              <h2 id="lp-trust-h">Built on evidence, consent and control</h2>
            </div>
            <div className="lp-trust">
              <article className="lp-trust-card lp-trust-wide">
                <h3><Icon name="layers" />Evidence-tiered matching with provenance</h3>
                <p>Every fact about a capital provider carries one of six labels. Unknown is never a match, and AI-inferred values are never shown as verified.</p>
                <ul className="lp-prov">
                  {PROVENANCE.map((p) => (
                    <li key={p.label}><span className={`lp-prov-label lp-prov-${p.label.split(' ')[0].toLowerCase()}`}>{p.label}</span><span className="lp-prov-note">{p.note}</span></li>
                  ))}
                </ul>
              </article>
              <article className="lp-trust-card">
                <h3><Icon name="lock" />Privacy and consent</h3>
                <p>Your company data is used to assess and match your company, and capital providers do not see it. You decide how AI may process it, you can see the AI calls made for your account, and you can export or delete your data from Settings.</p>
              </article>
              <article className="lp-trust-card lp-trust-navy">
                <h3><Icon name="users" />You stay in control</h3>
                <p className="lp-trust-quote">We help you with fundraising. We never fundraise for you.</p>
                <p>You choose who to contact and you send every message. Matches are fits, not offers, and no provider pays to rank higher.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="faq" className="lp-section" aria-labelledby="lp-faq-h">
          <div className="lp-wrap lp-faq-grid">
            <div className="lp-section-head lp-left-head">
              <p className="lp-eyebrow">FAQ</p>
              <h2 id="lp-faq-h">Questions founders ask first</h2>
              <p className="lp-section-sub lp-left">Anything else? Create an account and ask the in-app assistant, or <Link to="/login">sign in</Link>.</p>
            </div>
            <div className="lp-faq">
              {FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
            </div>
          </div>
        </section>

        <section className="lp-final" aria-labelledby="lp-final-h">
          <div className="lp-wrap lp-final-row">
            <div>
              <h2 id="lp-final-h">See where your company stands</h2>
              <p>Start with your readiness and capital routes. It takes a few minutes, and you decide what happens next.</p>
            </div>
            <div className="lp-cta-row">
              <Button as={Link} to="/signup" variant="accent" size="lg" iconRight="arrowRight">Create your free account</Button>
              <Button as={Link} to="/login" variant="secondary" size="lg" className="lp-btn-outline">Sign in</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <div>
            <Wordmark />
            <p className="lp-footer-line">We help you with fundraising. We never fundraise for you.</p>
          </div>
          <nav aria-label="Footer" className="lp-footer-nav">
            <a href="#how">How it works</a>
            <a href="#capital">Capital Access</a>
            <a href="#experts">Expert Access</a>
            <a href="#faq">FAQ</a>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create account</Link>
          </nav>
        </div>
        <div className="lp-wrap lp-footer-legal">
          <p>© {new Date().getFullYear()} Deligato. Information on capital providers is shown with its source and may be incomplete. Nothing on this site is investment, legal or tax advice.</p>
        </div>
      </footer>
    </div>
  );
}
