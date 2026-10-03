import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from '../design/ui';
import PlanColumns, { OptionalSupport, PricingFaq } from '../components/billing/PlanColumns';
import { getToken } from '../lib/auth';
import { getPlans } from '../lib/billing';
import useApi from '../lib/useApi';
import { cleanCopy, columnsOf, priceLine, stageOf } from '../lib/pricing';
import './landing.css';
import '../components/billing/billing.css';

// Public pricing at /pricing (D60/D61). Every price, label and limit is rendered from
// GET /api/v1/billing/plans; if it can't load, no price is shown (never a hard-coded one).

function Wordmark() {
  return (
    <Link to="/" className="lp-wordmark" aria-label="Deligato, Capital Access: home">
      <span className="lp-wordmark-name">Deligato</span>
      <span className="lp-wordmark-sub">Capital Access</span>
    </Link>
  );
}

/** Free → Understand · $54/$99 → Assess & Improve · Company Intelligence → Stay Ready · Capital Raising → Run Your Raise */
function OfferLine({ data }) {
  const groups = [];
  for (const p of columnsOf(data)) {
    const stage = stageOf(p.id);
    if (!stage) continue;
    const g = groups.find((x) => x.stage === stage);
    const label = p.tier ? p.name : priceLine(p.prices[0]).replace(/ one-time$/, '');
    if (g) g.labels.push(label); else groups.push({ stage, labels: [label] });
  }
  return (
    <ol className="pr-offer" aria-label="The offer">
      {groups.map((g) => (
        <li key={g.stage}><span className="pr-offer-what">{g.labels.join(' / ')}</span><span className="pr-offer-arrow" aria-hidden="true">→</span><span className="pr-offer-stage">{g.stage}</span></li>
      ))}
    </ol>
  );
}

export default function PricingPage() {
  const signedIn = Boolean(getToken());
  const q = useApi(() => getPlans(), []);
  useEffect(() => { document.title = 'Pricing · Deligato'; }, []);
  const data = q.data;

  const cta = (plan, price) => {
    const free = Number(price?.amount_usd) === 0;
    if (!signedIn) {
      return <Button as={Link} to="/signup" variant={plan.id === 'capital-raising' ? 'accent' : free ? 'primary' : 'secondary'} block>{free ? 'Start free' : 'Create your account'}</Button>;
    }
    if (free) return <Button as={Link} to="/" variant="secondary" block>Open the app</Button>;
    return (
      <Button as={Link} to={`/packages?choose=${encodeURIComponent(plan.id)}&price=${encodeURIComponent(price.key)}`} variant={plan.id === 'capital-raising' ? 'accent' : 'secondary'} block>
        Choose {plan.name}
      </Button>
    );
  };

  return (
    <div className="lp pr-page">
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
        <section className="pr-hero">
          <div className="lp-wrap">
            <p className="lp-eyebrow">Pricing</p>
            <h1 className="pr-h1">Pay for the stage you&apos;re at.</h1>
            <p className="pr-lede">Start free and understand where you stand. Assess and improve once. Stay ready every month. Run your raise when it&apos;s time, then step back down. {data?.currency ? `All prices in ${data.currency}.` : ''}</p>
            {data && <OfferLine data={data} />}
          </div>
        </section>

        <section className="pr-body">
          <div className="lp-wrap">
            {q.error ? (
              <div className="pr-error" role="status">
                <p><strong>Prices couldn&apos;t load just now.</strong> Nothing is shown rather than a price that might be out of date.</p>
                <Button variant="secondary" onClick={q.reload}>Try again</Button>
              </div>
            ) : !data ? (
              <div className="pr-cols" aria-busy="true" aria-label="Loading prices">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h="520px" r="16px" />)}</div>
            ) : (
              <>
                {!data.checkout?.enabled && (
                  <p className="pr-payments-off" role="status"><strong>Payments open soon.</strong> You can start free today; paid plans aren&apos;t charged yet.</p>
                )}
                <PlanColumns data={data} cta={cta} />
                {data.fair_use?.footnote && <p className="pr-foot">“Full access / plan limits”: {cleanCopy(data.fair_use.footnote)}</p>}
                <OptionalSupport data={data} action={signedIn ? <Button as={Link} to="/experts" variant="secondary">Find an expert</Button> : null} />
                <PricingFaq data={data} />
                {data.notice && <p className="pr-notice">{cleanCopy(data.notice)}</p>}
              </>
            )}
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
