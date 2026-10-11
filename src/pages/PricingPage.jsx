import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from '../design/ui';
import { BillingToggle, CompareTable, PlatformPlans, PricingFaq, ProductMoment, ServicesSection } from '../components/billing/PricingPlans';
import { getToken } from '../lib/auth';
import { getPlans } from '../lib/billing';
import { loadCatalog } from '../lib/ladder';
import { PRODUCT_SUB_LABEL } from '../lib/brand';
import useApi from '../lib/useApi';
import { cleanCopy, hasAnnual, platformOf } from '../lib/pricing';
import './landing.css';
import '../components/billing/billing.css';

// Public pricing at /pricing (D73: Free · Capital Intelligence · Capital Raising + 2 one-time services).
// Every price, label and limit is rendered from GET /api/v1/billing/plans (and GET /packages/catalog for
// a D73 plan an older price list did not price); if it can't load,
// no price is shown (never a hard-coded one). Checkout behaves exactly as before: signed out,
// every action goes to sign-up; signed in, a paid choice opens the Plans page, where payments
// stay off until billing is switched on.

function Wordmark() {
  return (
    <Link to="/" className="lp-wordmark" aria-label={`Deligato, ${PRODUCT_SUB_LABEL}: home`}>
      <span className="lp-wordmark-name">Deligato</span>
      <span className="lp-wordmark-sub">{PRODUCT_SUB_LABEL}</span>
    </Link>
  );
}

export default function PricingPage() {
  const signedIn = Boolean(getToken());
  const q = useApi(() => getPlans(), []);
  const catQ = useApi(() => loadCatalog().catch(() => null), []);
  const catalog = catQ.data || null;
  const [billing, setBilling] = useState('monthly');
  useEffect(() => { document.title = 'Pricing · Deligato'; }, []);
  const data = q.data;
  const annualNote = data ? (platformOf(data, catalog).flatMap((p) => p.prices || []).find((x) => x.billing === 'annual')?.note || null) : null;

  const cta = (plan, price, story = {}) => {
    const label = story.cta || `Choose ${plan.name}`;
    const free = Number(price?.amount_usd) === 0;
    const variant = plan.id === 'capital-raising' ? 'accent' : plan.id === 'capital-assessment' ? 'primary' : free ? 'primary' : 'secondary';
    if (!signedIn) return <Button as={Link} to="/signup" variant={variant} iconRight="arrowRight" block>{label}</Button>;
    if (free) return <Button as={Link} to="/" variant="secondary" iconRight="arrowRight" block>Open the app</Button>;
    // D73: a plan billing does not sell yet is shown, never sold (none since RC3 phase 3; payments stay off).
    if (plan.checkout === false) return <Button variant={variant} block disabled>Opens with payments</Button>;
    return (
      <Button as={Link} to={`/packages?choose=${encodeURIComponent(plan.id)}&price=${encodeURIComponent(price.key)}`} variant={variant} iconRight="arrowRight" block>
        {label}
      </Button>
    );
  };

  return (
    <div className="lp pr-page pr2-page">
      <a className="lp-skip" href="#main">Skip to content</a>
      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <Wordmark />
          <nav className="lp-nav pr-nav" aria-label="Main">
            <div className="lp-nav-cta">
              {signedIn ? (
                <Button as={Link} to="/" variant="primary" size="md">Open the app</Button>
              ) : (
                <>
                  <Button as={Link} to="/login" variant="ghost" size="md" className="lp-signin">Sign in</Button>
                  <Button as={Link} to="/signup" variant="primary" size="md">Create your account</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="pr2-hero">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Pricing</p>
            <h1 className="pr2-h1">Start free. Upgrade when you need more.</h1>
            <p className="pr2-lede">Explore for free with your first ranked matches. Prepare and manage your raise with Capital Intelligence. Run it end-to-end with Capital Raising.</p>
            <ol className="pr2-steps" aria-label="How the plans build">
              <li><b>1</b>Explore</li>
              <li><b>2</b>Prepare &amp; manage</li>
              <li><b>3</b>Run your raise</li>
            </ol>
          </div>
        </section>

        <section className="pr2-section pr2-section-tight" aria-label="Plans">
          <div className="lp-wrap">
            {q.error ? (
              <div className="pr-error" role="status">
                <p><strong>Prices couldn&apos;t load just now.</strong> Nothing is shown rather than a price that might be out of date.</p>
                <Button variant="secondary" onClick={q.reload}>Try again</Button>
              </div>
            ) : !data ? (
              <div className="pr2-loading" aria-busy="true" aria-label="Loading prices">
                {[0, 1, 2].map((i) => <Skeleton key={i} h="560px" r="24px" />)}
              </div>
            ) : (
              <>
                <div className="pr2-bar">
                  {hasAnnual(data, catalog) ? <BillingToggle value={billing} onChange={setBilling} note={annualNote} /> : <span />}
                  {!data.checkout?.enabled && (
                    <p className="pr2-payments" role="status"><strong>Payments open soon.</strong> Start free today; paid plans aren&apos;t charged yet. Prices in {data.currency || 'USD'}.</p>
                  )}
                </div>
                <PlatformPlans data={data} catalog={catalog} cta={cta} billing={billing} />
                {data.fair_use?.footnote && <p className="pr-foot">“Full access / plan limits”: {cleanCopy(data.fair_use.footnote)}</p>}
              </>
            )}
          </div>
        </section>

        <section className="pr2-section pr2-section-tight">
          <div className="lp-wrap"><ProductMoment /></div>
        </section>

        {data && (
          <>
            <section className="pr2-section pr2-section-white">
              <div className="lp-wrap"><ServicesSection data={data} cta={cta} /></div>
            </section>
            <section className="pr2-section">
              <div className="lp-wrap"><CompareTable data={data} catalog={catalog} /></div>
            </section>
            <section className="pr2-section pr2-section-tight">
              <div className="lp-wrap">
                <PricingFaq data={data} catalog={catalog} />
                {data.notice && <p className="pr2-notice">{cleanCopy(data.notice)}</p>}
              </div>
            </section>
          </>
        )}

        <section className="pr2-final ui-on-navy" aria-labelledby="pr2-final-h">
          <div className="lp-wrap">
            <h2 id="pr2-final-h">Not sure where to start? Start free.</h2>
            <p>See where your company stands and your first ranked matches today. Upgrade when you are ready to prepare and run your raise.</p>
            <div className="pr2-final-cta">
              <Button as={Link} to={signedIn ? '/' : '/signup'} variant="accent" size="lg" iconRight="arrowRight">{signedIn ? 'Open the app' : 'Start free'}</Button>
              <Button as={Link} to="/experts" variant="secondary" size="lg" className="pr2-btn-outline">Talk to an advisor</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <Wordmark />
          <nav aria-label="Footer" className="lp-footer-nav">
            <Link to="/">Home</Link>
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
