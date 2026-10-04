import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadPublicStats } from '../lib/publicStats';
import { Button, Icon } from '../design/ui';
import './landing.css';

// Public marketing page for signed-out visitors at "/" (Capital Intelligence positioning, 5 Oct 2026).
// Copy rules (BUILD/product/positioning.md): no outcome promises, no broker language, no banned
// strings (§3), no invented logos, testimonials or numbers. Every product panel on this page is a
// labelled sample built from the product's own components and vocabulary, never real customer data.
// Only live capabilities are described. Nothing about future lending or provider routing.

const TITLE = 'Deligato · Capital Intelligence for founders and growing companies';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const JOURNEY = [
  { id: 'understand', n: '01', label: 'Understand your company' },
  { id: 'ready', n: '02', label: 'Become capital ready' },
  { id: 'capital', n: '03', label: 'Find the right capital' },
  { id: 'why', n: '04', label: 'Understand why it fits' },
  { id: 'execute', n: '05', label: 'Execute the raise' },
];

const PROVENANCE = ['Capital Provider Verified', 'Research Verified', 'Licensed Data Provider', 'Public Source', 'AI Inferred', 'Unknown'];

const ROUTES = [
  { k: 'Venture capital', s: 'fit' },
  { k: 'Angel investors', s: 'fit' },
  { k: 'Revenue-based finance', s: 'partial' },
  { k: 'Venture debt', s: 'no' },
  { k: 'Grants and government programmes', s: 'fit' },
  { k: 'Bank and working-capital finance', s: 'partial' },
];

function Wordmark({ onDark = true }) {
  return (
    <Link to="/" className={`lp-wordmark${onDark ? '' : ' lp-wordmark-ink'}`} aria-label="Deligato, Capital Intelligence: home">
      <span className="lp-wordmark-name">Deligato</span>
      <span className="lp-wordmark-sub">Capital Intelligence</span>
    </Link>
  );
}

function FitMark({ s }) {
  const t = { fit: '✓', partial: '~', no: '×', unknown: '?' }[s];
  return <span className={`lp-fm lp-fm-${s}`} aria-hidden="true">{t}</span>;
}

/* ---------- Hero: product view (sample company) ---------- */
function HeroProduct() {
  const fits = [
    { k: 'Stage', s: 'fit', v: 'Seed', src: 'Capital Provider Verified' },
    { k: 'Sector', s: 'fit', v: 'B2B software', src: 'Research Verified' },
    { k: 'Geography', s: 'fit', v: 'GCC', src: 'Public Source' },
    { k: 'Ticket size', s: 'partial', v: 'Lower than your round', src: 'Public Source' },
    { k: 'Instrument', s: 'unknown', v: 'Not on record', src: 'Unknown' },
  ];
  const label = { fit: 'Fits', partial: 'Partly fits', unknown: 'Not on record' };
  return (
    <figure className="lp-app" aria-label="Product view of Deligato with a sample company">
      <div className="lp-app-bar" aria-hidden="true">
        <span className="lp-app-dots"><i /><i /><i /></span>
        <span className="lp-app-url">app.deligato.io / capital / matches</span>
      </div>
      <div className="lp-app-body">
        <aside className="lp-app-side" aria-hidden="true">
          <span className="is-on"><Icon name="home" /></span>
          <span><Icon name="building" /></span>
          <span><Icon name="gauge" /></span>
          <span><Icon name="compass" /></span>
          <span><Icon name="target" /></span>
          <span><Icon name="kanban" /></span>
        </aside>
        <div className="lp-app-main">
          <div className="lp-app-head">
            <div>
              <p className="lp-app-kicker">Sample company · Seed · GCC</p>
              <p className="lp-app-title">Why this provider appears for you</p>
            </div>
            <span className="lp-pill lp-pill-strong"><span className="lp-dot" aria-hidden="true" />Strong fit</span>
          </div>
          <ul className="lp-fits">
            {fits.map((f) => (
              <li key={f.k} className={`lp-fit lp-fit-${f.s}`}>
                <FitMark s={f.s} />
                <span className="lp-fit-k">{f.k}</span>
                <span className="lp-fit-v">{f.s === 'unknown' ? label.unknown : f.v}</span>
                <span className="lp-src">{f.src}</span>
              </li>
            ))}
          </ul>
          <p className="lp-app-note"><Icon name="info" />Instrument is not on record, so it does not count in your favour.</p>
          <div className="lp-app-row">
            <div className="lp-mini">
              <p className="lp-mini-k">Financial health</p>
              <p className="lp-mini-v">Burning cash</p>
              <p className="lp-mini-s">Runway shown because you are burning</p>
            </div>
            <div className="lp-mini">
              <p className="lp-mini-k">Next best action</p>
              <p className="lp-mini-v">Add your cap table</p>
              <p className="lp-mini-s">Investors at this stage ask for it first</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="lp-app-cap">Product view with a sample company. Not a real provider or customer.</figcaption>
    </figure>
  );
}

/* ---------- Journey vignettes (samples) ---------- */
function VUnderstand() {
  return (
    <div className="lp-v" aria-hidden="true">
      <div className="lp-v-head"><span>Company Intelligence</span><span className="lp-v-tag">Sample</span></div>
      <div className="lp-v-grid2">
        <div className="lp-v-stat"><p>Financial state</p><strong>Break-even</strong><small>Assessed on margins and cash cover, not runway</small></div>
        <div className="lp-v-stat"><p>Company record</p><strong>7 of 12</strong><small>documents and facts on file</small></div>
      </div>
      <div className="lp-v-list">
        <p className="lp-v-sub">What changed this month</p>
        <div className="lp-v-li"><span className="lp-dotc lp-dotc-ok" />Revenue up on last month</div>
        <div className="lp-v-li"><span className="lp-dotc lp-dotc-warn" />Pitch deck last updated 7 months ago</div>
      </div>
    </div>
  );
}
function VReady() {
  return (
    <div className="lp-v" aria-hidden="true">
      <div className="lp-v-head"><span>Capital Readiness</span><span className="lp-v-tag">Sample</span></div>
      <div className="lp-v-ready">
        <div className="lp-ring" style={{ '--p': 64 }}><span>64</span></div>
        <div>
          <p className="lp-v-band">Semi-ready</p>
          <p className="lp-v-small">80 is a stretch target, not a pass mark.</p>
        </div>
      </div>
      <div className="lp-v-list">
        <p className="lp-v-sub">Close these first</p>
        <div className="lp-v-li"><span className="lp-v-num">1</span>Financial model covers only 6 months</div>
        <div className="lp-v-li"><span className="lp-v-num">2</span>No signed customer contracts on file</div>
        <div className="lp-v-li"><span className="lp-v-num">3</span>Cap table not uploaded</div>
      </div>
    </div>
  );
}
function VCapital() {
  const lab = { fit: 'Fits', partial: 'Possible', no: 'Unlikely now' };
  return (
    <div className="lp-v" aria-hidden="true">
      <div className="lp-v-head"><span>Kinds of capital that fit</span><span className="lp-v-tag">Sample</span></div>
      <ul className="lp-v-routes">
        {ROUTES.map((r) => (
          <li key={r.k} className={`lp-route lp-route-${r.s}`}><FitMark s={r.s} /><span>{r.k}</span><em>{lab[r.s]}</em></li>
        ))}
      </ul>
      <p className="lp-v-small">Start raising by March, based on your target date and how long this kind of raise usually takes.</p>
    </div>
  );
}
function VWhy() {
  return (
    <div className="lp-v" aria-hidden="true">
      <div className="lp-v-head"><span>Evidence for one match</span><span className="lp-v-tag">Sample</span></div>
      <div className="lp-v-evi">
        <div className="lp-v-li"><FitMark s="fit" /><span><b>Invests at seed</b><small>From the provider's own website · checked 3 weeks ago</small></span></div>
        <div className="lp-v-li"><FitMark s="fit" /><span><b>Backs B2B software</b><small>Research Verified · 4 recent investments</small></span></div>
        <div className="lp-v-li"><FitMark s="partial" /><span><b>Typical cheque below your round</b><small>Public Source · may co-invest</small></span></div>
        <div className="lp-v-li"><FitMark s="unknown" /><span><b>Instrument not on record</b><small>Unknown · never counted as a fit</small></span></div>
      </div>
    </div>
  );
}
function VExecute() {
  const cols = [
    { t: 'Shortlisted', n: 6 },
    { t: 'Contacted', n: 3 },
    { t: 'Meeting', n: 2 },
    { t: 'Diligence', n: 1 },
  ];
  return (
    <div className="lp-v" aria-hidden="true">
      <div className="lp-v-head"><span>Your raise pipeline</span><span className="lp-v-tag">Sample</span></div>
      <div className="lp-v-kanban">
        {cols.map((c, i) => (
          <div key={c.t} className="lp-kcol">
            <p>{c.t}<span>{c.n}</span></p>
            {Array.from({ length: Math.min(c.n, 2) }).map((_, j) => <i key={j} className={i === 2 && j === 0 ? 'is-hot' : ''} />)}
          </div>
        ))}
      </div>
      <div className="lp-v-draft"><Icon name="edit" /><span><b>Outreach draft ready</b><small>You edit it and send it yourself.</small></span></div>
    </div>
  );
}

const STEPS = [
  {
    ...JOURNEY[0], V: VUnderstand, h: 'Understand your company',
    body: 'Build a living picture of your company: profile, financial health and company record in one place. Financial health adapts to where you are, whether burning cash, break-even or profitable, so you are judged on the right measures.',
    points: ['Financial health that adapts to your financial state', 'What changed, and the one thing to do next', 'Stale and expiring documents flagged for you'],
  },
  {
    ...JOURNEY[1], V: VReady, h: 'Become capital ready',
    body: 'See how investors and capital providers are likely to read your company today, and what to fix first. Start with a free readiness score, then go deeper with a full Capital Readiness assessment and a ranked improvement plan.',
    points: ['Free readiness score to start', 'Full assessment: strengths, gaps and a ranked plan', 'Re-assess when your numbers change'],
  },
  {
    ...JOURNEY[2], V: VCapital, h: 'Find the right capital',
    body: 'The right kind of capital comes before any list of names. Deligato checks venture, angels, grants and government programmes, revenue-based finance, venture debt, bank and working-capital finance, and more, against your company and your capital need.',
    points: ['16 kinds of capital checked first', 'Capital need, purpose and target date', 'When to start raising, from your target date'],
  },
  {
    ...JOURNEY[3], V: VWhy, h: 'Understand why it fits',
    body: 'Every match shows what fits, what only partly fits and what is not known yet, criterion by criterion, with the source of each fact and when it was last checked. Unknown is never counted as a fit.',
    points: ['Fit explained criterion by criterion', 'A source label on every provider fact', 'Strong and possible fits kept apart'],
  },
  {
    ...JOURNEY[4], V: VExecute, h: 'Execute the raise',
    body: 'Run the raise in one place: shortlist, pipeline stages, meeting notes and follow-ups, outreach drafts written for each provider, and a data room checklist of what investors will ask for at your stage.',
    points: ['Shortlist and pipeline in one view', 'Outreach drafts you edit and send yourself', 'Data room checklist for your stage'],
  },
];

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
            <a href="#journey" onClick={close}>How it works</a>
            <a href="#different" onClick={close}>Why Deligato</a>
            <a href="#evidence" onClick={close}>Evidence</a>
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
        {/* ---------- HERO ---------- */}
        <section className="lp-hero" aria-labelledby="lp-hero-h">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow lp-eyebrow-gold">Capital Intelligence</p>
              <h1 id="lp-hero-h">Know which capital fits your company, <span>and exactly why.</span></h1>
              <p className="lp-lede">
                Deligato understands your company, shows how capital-ready you are, finds the kinds of capital and the providers that fit, and explains every match with its evidence. Then it helps you run the raise.
              </p>
              <div className="lp-cta-row">
                <Button as={Link} to="/signup" variant="accent" size="lg" iconRight="arrowRight">Create your free account</Button>
                <Button as="a" href="#journey" variant="secondary" size="lg" className="lp-btn-outline">See how it works</Button>
              </div>
              <p className="lp-hero-note">Not an investor directory. We help you with fundraising. We never fundraise for you.</p>
            </div>
            <HeroProduct />
          </div>
          <div className="lp-wrap">
            <ol className="lp-journey-strip" aria-label="The Deligato journey">
              {JOURNEY.map((j) => (
                <li key={j.id}><a href={`#step-${j.id}`}><span className="lp-js-n">{j.n}</span>{j.label}</a></li>
              ))}
            </ol>
          </div>
        </section>

        {stats && (
          <section className="lp-proofband" aria-label={`Deligato research database, as of ${asOf}`}>
            <div className="lp-wrap">
              <dl className="lp-proof">
                {stats.items.map((it) => (
                  <div key={it.key}><dt>{it.label}</dt><dd className="ui-num">{it.value.toLocaleString('en-US')}</dd></div>
                ))}
              </dl>
              <p className="lp-asof">As of {asOf}. Counted live from our research database.</p>
            </div>
          </section>
        )}

        {/* ---------- NOT A DIRECTORY ---------- */}
        <section id="different" className="lp-section" aria-labelledby="lp-diff-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">Why Deligato</p>
              <h2 id="lp-diff-h">A directory gives you names. Deligato gives you judgement you can check.</h2>
              <p className="lp-section-sub">Lists of investors are easy to find. Knowing which capital suits your company, whether you are ready for it, and why a provider fits is the hard part. That is what Deligato is built to do.</p>
            </div>
            <div className="lp-compare">
              <div className="lp-compare-col lp-compare-dir">
                <p className="lp-compare-h">An investor directory</p>
                <ul>
                  <li>Starts with a long list of names</li>
                  <li>Assumes venture capital is the answer</li>
                  <li>Filters on a few tags, and gaps look like fits</li>
                  <li>Leaves you to guess whether you are ready</li>
                  <li>Stops once you have the list</li>
                </ul>
              </div>
              <div className="lp-compare-col lp-compare-dg">
                <p className="lp-compare-h">Deligato</p>
                <ul>
                  <li><Icon name="building" />Starts with your company, its finances and its record</li>
                  <li><Icon name="compass" />Checks which kinds of capital fit before naming anyone</li>
                  <li><Icon name="search" />Explains each fit with sources; unknown never counts</li>
                  <li><Icon name="gauge" />Shows how ready you are and what to fix first</li>
                  <li><Icon name="kanban" />Carries on into the raise: shortlist, pipeline, outreach</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- JOURNEY ---------- */}
        <section id="journey" className="lp-section lp-section-white" aria-labelledby="lp-journey-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow">How it works</p>
              <h2 id="lp-journey-h">From your company to a raise you run with evidence</h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map(({ id, n, h, body, points, V }) => (
                <li key={id} id={`step-${id}`} className="lp-step">
                  <div className="lp-step-copy">
                    <p className="lp-step-n"><span>{n}</span>Step {Number(n)} of 5</p>
                    <h3>{h}</h3>
                    <p className="lp-step-body">{body}</p>
                    <ul className="lp-step-points">
                      {points.map((p) => <li key={p}><Icon name="check" />{p}</li>)}
                    </ul>
                  </div>
                  <div className="lp-step-visual"><V /></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- EVIDENCE ---------- */}
        <section id="evidence" className="lp-section lp-section-ink" aria-labelledby="lp-evi-h">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-eyebrow lp-eyebrow-gold">Evidence first</p>
              <h2 id="lp-evi-h">Every fact has a source. Every gap is shown as a gap.</h2>
            </div>
            <div className="lp-evi">
              <article className="lp-evi-card">
                <h3><Icon name="search" />Unknown is never a match.</h3>
                <p>If we don't know whether a provider accepts your stage or instrument, we say so. Missing data never counts in your favour, and it never quietly rules you out either.</p>
              </article>
              <article className="lp-evi-card">
                <h3><Icon name="layers" />Labelled by where it came from.</h3>
                <p>Each provider detail carries its source and when it was last checked. AI-inferred details are never shown as verified.</p>
                <ul className="lp-prov-chips" aria-label="Source labels">
                  {PROVENANCE.map((l) => <li key={l} className={`lp-prov-label lp-prov-${l.split(' ')[0].toLowerCase()}`}>{l}</li>)}
                </ul>
              </article>
              <article className="lp-evi-card">
                <h3><Icon name="users" />You stay in control of every contact.</h3>
                <p>Deligato drafts; you decide, edit and send. Nothing is ever sent on your behalf.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ---------- HUMAN ---------- */}
        <section className="lp-section" aria-labelledby="lp-exp-h">
          <div className="lp-wrap lp-human">
            <div className="lp-human-img">
              <img src="/img/lp-advisory.jpg" width="1100" height="733" loading="lazy" decoding="async" alt="A founder and an adviser reviewing a plan together at a laptop." />
            </div>
            <div className="lp-human-copy">
              <p className="lp-eyebrow">Expertise when a gap needs it</p>
              <h2 id="lp-exp-h">Technology first. Specialists when you want them.</h2>
              <p className="lp-section-sub lp-left">Deligato works on its own. When your readiness shows a gap that needs a specialist, such as a financial model, the investor deck, legal and cap-table work or fractional finance support, you can ask for expert help. It is entirely optional, and you agree the scope directly.</p>
              <div className="lp-cta-row">
                <Button as={Link} to="/signup" variant="primary" size="lg" iconRight="arrowRight">Start with your company</Button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- DATA ---------- */}
        <section className="lp-section lp-section-tight" aria-labelledby="lp-data-h">
          <div className="lp-wrap">
            <div className="lp-data">
              <span className="lp-feature-icon" aria-hidden="true"><Icon name="lock" /></span>
              <div>
                <h2 id="lp-data-h" className="lp-h3">Your company data stays yours</h2>
                <p>Company facts only go to AI with your consent, never your name or contact details. Every AI request is logged where you can see it. Export or delete your data at any time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- FINAL ---------- */}
        <section className="lp-final" aria-labelledby="lp-final-h">
          <div className="lp-final-img" aria-hidden="true"><img src="/img/lp-team.jpg" width="1400" height="596" loading="lazy" decoding="async" alt="" /></div>
          <div className="lp-wrap lp-final-row">
            <div>
              <p className="lp-eyebrow lp-eyebrow-gold">Capital Intelligence</p>
              <h2 id="lp-final-h">Start with your company. See what fits, and why.</h2>
              <p>Free to start. We help you with fundraising. We never fundraise for you.</p>
            </div>
            <div className="lp-cta-row">
              <Button as={Link} to="/signup" variant="accent" size="lg" iconRight="arrowRight">Create your free account</Button>
              <Button as={Link} to="/pricing" variant="secondary" size="lg" className="lp-btn-outline">See pricing</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <div className="lp-footer-brand">
            <Wordmark onDark={false} />
            <p>Capital Intelligence for founders and growing companies. Part of Conncct.</p>
          </div>
          <nav aria-label="Footer" className="lp-footer-nav">
            <a href="#journey">How it works</a>
            <a href="#evidence">Evidence</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create your account</Link>
          </nav>
        </div>
        <div className="lp-wrap lp-footer-legal">
          <p>© {new Date().getFullYear()} Deligato. We help you with fundraising. We never fundraise for you. Deligato is not an investor or a broker.</p>
        </div>
      </footer>
    </div>
  );
}
