import { Fragment, useState } from 'react';
import { Badge, Icon } from '../../design/ui';
import {
  cleanCopy, compareCell, isLaunching, money, PLAN_STORY, planBullets, platformOf, priceFor, priceLine, priceParts, servicesOf, serviceTerms,
} from '../../lib/pricing';
import './pricing.css';

/**
 * D68 pricing: three platform plans (Understand → Stay Ready → Raise) and two one-time
 * Capital Readiness services shown apart. Every price, label and limit comes from
 * GET /billing/plans; the card words come from lib/pricing PLAN_STORY and are filtered by
 * what the API says each plan includes. `cta(plan, price, story)` renders each action, so the
 * public page and the signed-in Plans page keep their own behaviour (checkout stays as it is).
 */

/** Monthly / annual switch (shown only when the API offers a yearly price). */
export function BillingToggle({ value, onChange, note }) {
  return (
    <div className="pr2-toggle" role="radiogroup" aria-label="Billing period">
      {[['monthly', 'Monthly'], ['annual', 'Annual']].map(([k, label]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={value === k ? 'is-on' : ''} onClick={() => onChange(k)}>
          {label}{k === 'annual' && note ? <span className="pr2-toggle-note">{cleanCopy(note)}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Price({ price }) {
  const { amount, cadence } = priceParts(price);
  return (
    <p className="pr2-price">
      <span className="pr2-amount">{amount}</span>
      {cadence && <span className="pr2-cadence">{cadence.replace(/^\/ /, '/')}</span>}
    </p>
  );
}

function Bullets({ items }) {
  return (
    <ul className="pr2-list">
      {items.map((x) => <li key={x}><Icon name="check" /><span>{x}</span></li>)}
    </ul>
  );
}

/** The three platform cards with a quiet connector between them. */
export function PlatformPlans({ data, cta, billing = 'monthly', isCurrent = () => false, highlight }) {
  const plans = platformOf(data);
  return (
    <>
    <div className="pr2-plans" role="list" aria-label="Platform plans">
      {plans.map((plan, i) => {
        const story = PLAN_STORY[plan.id] || {};
        const price = priceFor(plan, billing);
        const tone = plan.id === 'capital-raising' ? 'raise' : plan.id === 'company-intelligence' ? 'intel' : 'free';
        return (
          <Fragment key={plan.id}>
            {i > 0 && <span className="pr2-link" aria-hidden="true"><Icon name="arrowRight" /></span>}
            <article role="listitem" aria-labelledby={`pr2-${plan.id}`}
              className={`pr2-card pr2-card-${tone}${isCurrent(plan) ? ' is-current' : ''}${highlight === plan.id ? ' is-hl' : ''}`}>
              <header className="pr2-card-head">
                <div className="pr2-card-top">
                  <p className="pr2-label">{story.label || cleanCopy(plan.tagline)}</p>
                  {story.badge && <span className="pr2-badge">{story.badge}</span>}
                </div>
                <h3 id={`pr2-${plan.id}`} className="pr2-name">{plan.name}</h3>
                <Price price={price} />
                {price?.note ? <p className="pr2-note">{cleanCopy(price.note)}</p> : <p className="pr2-note" aria-hidden="true">&nbsp;</p>}
                <p className="pr2-promise">{story.promise || cleanCopy(plan.tagline)}</p>
              </header>
              <div className="pr2-cta">{cta(plan, price, story)}</div>
              <Bullets items={planBullets(plan)} />
            </article>
          </Fragment>
        );
      })}
    </div>
    <p className="pr2-boundary">Company Intelligence is continuous intelligence on your company. Investor and capital-provider matching, and the tools to run your raise, are in Capital Raising.</p>
    </>
  );
}

/**
 * The human/product moment between the plans and the services. The photo slot takes a
 * LICENSED image only: put it at web/public/images/pricing/founder-advisor.jpg (1600 × 1200,
 * 4:3, subject left of centre; the panel floats on the right) and set PHOTO below. Until then a
 * non-photographic placeholder in brand tones is shown. The panel is real HTML, marked as an example.
 */
const PHOTO = null; // '/images/pricing/founder-advisor.jpg' once Bilal supplies a licensed image

export function ProductMoment() {
  const rows = [['Financials', true], ['Traction', true], ['Team', true], ['Deal structure', false]];
  return (
    <section className="pr2-moment" aria-labelledby="pr2-moment-h">
      <div className="pr2-moment-copy">
        <p className="lp-eyebrow">Software first, people when you want them</p>
        <h2 id="pr2-moment-h" className="pr2-h2">See exactly where you stand, then decide what to fix.</h2>
        <p className="pr2-sub">Your readiness, broken down factor by factor. When a gap needs a specialist, an advisor can walk it through with you.</p>
      </div>
      <figure className="pr2-photo">
        {PHOTO
          ? <img src={PHOTO} alt="A founder reviewing their readiness with a senior advisor" width="1600" height="1200" loading="lazy" />
          : (
            <div className="pr2-photo-ph" role="img" aria-label="Image placeholder">
              <span className="pr2-ph-a" /><span className="pr2-ph-b" /><span className="pr2-ph-c" /><span className="pr2-ph-d" />
            </div>
          )}
        <div className="pr2-panel" aria-label="Illustrative example of a Deligato readiness panel">
          <div className="pr2-panel-head">
            <span className="pr2-panel-title">Capital Readiness</span>
            <span className="pr2-panel-tag">Illustrative example</span>
          </div>
          <p className="pr2-panel-score"><strong>72</strong><span>/ 100</span></p>
          <div className="pr2-panel-bar" aria-hidden="true"><span style={{ width: '72%' }} /></div>
          <ul className="pr2-panel-rows">
            {rows.map(([k, ok]) => (
              <li key={k} className={ok ? 'is-ok' : 'is-attn'}>
                <span>{k}</span>
                {ok ? <span className="pr2-panel-ok"><Icon name="check" /><span className="ui-sr">Ready</span></span>
                  : <span className="pr2-panel-attn">Needs attention</span>}
              </li>
            ))}
          </ul>
        </div>
      </figure>
    </section>
  );
}

/**
 * The Capital Readiness Report as ONE service card (D69 layout, Bilal 5 Oct): a switch styled like
 * the billing toggle chooses "Report" ($54) or "Report + Advisor" ($99, 40-minute session). The
 * selected option shows its price, includes, the one terms line and its CTA. A service, not a tier.
 */
export function ServicesSection({ data, cta, isCurrent = () => false, highlight }) {
  const items = servicesOf(data);
  const [pick, setPick] = useState(() => (highlight && items.some((p) => p.id === highlight) ? highlight : items[0]?.id));
  if (!items.length) return null;
  const plan = items.find((p) => p.id === pick) || items[0];
  const story = PLAN_STORY[plan.id] || {};
  const price = plan.prices[0];
  const terms = serviceTerms(data);
  const label = (p) => (p.id === 'capital-assessment' ? 'Report + Advisor' : 'Report');
  return (
    <section className="pr2-services" aria-labelledby="pr2-services-h">
      <header className="pr2-section-head">
        <p className="lp-eyebrow">Need a deeper assessment?</p>
        <h2 id="pr2-services-h" className="pr2-h2">Get capital-ready before you raise.</h2>
        <p className="pr2-sub">Get a structured assessment of what&apos;s ready, what&apos;s missing and what to fix next.</p>
      </header>
      <article className={`pr2-svc${isCurrent(plan) ? ' is-current' : ''}`} aria-labelledby="pr2-svc-name">
        <div className="pr2-svc-main">
          <p className="pr2-svc-kicker">One-time service</p>
          <h3 id="pr2-svc-name" className="pr2-svc-name">CAPITAL READINESS REPORT</h3>
          {items.length > 1 && (
            <div className="pr2-toggle pr2-svc-switch" role="radiogroup" aria-label="Report option">
              {items.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={p.id === plan.id} className={p.id === plan.id ? 'is-on' : ''} onClick={() => setPick(p.id)}>
                  {label(p)} <span className="pr2-svc-switch-price">{money(p.prices[0].amount_usd)}</span>
                </button>
              ))}
            </div>
          )}
          <p className="pr2-svc-price"><strong>{money(price.amount_usd)}</strong><span> · one-time{plan.id === 'capital-assessment' ? ' · 40-minute advisor session' : ''}</span></p>
          <p className="pr2-svc-promise">{story.promise}</p>
        </div>
        <div className="pr2-svc-side">
          <Bullets items={planBullets(plan)} />
          {terms && <p className="pr2-svc-terms"><Icon name="spark" />{terms}</p>}
          <div className="pr2-svc-cta">{cta(plan, price, story)}</div>
        </div>
      </article>
    </section>
  );
}

/** "Compare what's included": grouped rows from the API (catalog entitlements), never typed here. */
export function CompareTable({ data }) {
  const cmp = data?.compare;
  if (!cmp || !Array.isArray(cmp.groups)) return null;
  const names = cmp.plans.map((id) => (data.plans || []).find((p) => p.id === id)?.name || id);
  return (
    <section className="pr2-compare" aria-labelledby="pr2-compare-h">
      <header className="pr2-section-head">
        <h2 id="pr2-compare-h" className="pr2-h2">Compare what&apos;s included</h2>
        <p className="pr2-sub">Straight from what each plan unlocks in the product.</p>
      </header>
      <div className="pr2-compare-head" aria-hidden="true">
        <span />
        {names.map((n) => <span key={n}>{n}</span>)}
      </div>
      {cmp.groups.map((g, gi) => (
        <details key={g.label} className="pr2-group" open={gi < 3}>
          <summary><span>{g.label}</span><Icon name="chevronDown" /></summary>
          <table className="pr2-table">
            <caption className="ui-sr">{g.label}</caption>
            <thead className="ui-sr"><tr><th scope="col">Feature</th>{names.map((n) => <th key={n} scope="col">{n}</th>)}</tr></thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{cleanCopy(r.label)}</th>
                  {r.values.map((v, i) => {
                    const c = compareCell(v);
                    return (
                      <td key={names[i]} data-plan={names[i]} className={`is-${c.kind}`}>
                        {c.kind === 'yes' ? <><Icon name="check" /><span className="ui-sr">Included</span></>
                          : c.kind === 'no' ? <><span aria-hidden="true">–</span><span className="ui-sr">Not included</span></>
                            : <span>{c.text}{isLaunching(c.text) && <> <Badge tone="outline" size="sm">Launching</Badge></>}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  );
}

/** The short FAQ (credit rule, 30-day inclusion, matching, step-down, yearly, USD). */
export function PricingFaq({ data }) {
  const plans = platformOf(data);
  const cr = plans.find((p) => p.id === 'capital-raising');
  const ci = plans.find((p) => p.id === 'company-intelligence');
  const paid = servicesOf(data).find((p) => p.credit);
  const days = servicesOf(data).find((p) => p.includes_company_intelligence_days)?.includes_company_intelligence_days;
  const crPrices = (cr?.prices || []).map(priceLine).join(' or ');
  const refund = data?.refund;
  const items = [
    cr && {
      q: 'Does Free include investor matching?',
      a: 'No. Free shows where your company stands and which types of capital fit your need, without naming providers. Matching investors and capital providers, why each one fits, your shortlist, pipeline and outreach are part of Capital Raising. If you saved investors before, they stay visible, read-only.',
    },
    cr && {
      q: 'Can I share my data room with investors?',
      a: 'Not yet. On Capital Raising your data room is private document storage: you upload, view, replace and delete your fundraising documents, and only your company can open them. Sharing with investors (invite links, permissions and activity) is coming later.',
    },
    cr && {
      q: 'Can I export my matches and pipeline?',
      a: 'Yes, on Capital Raising. Matches, Shortlist and Pipeline each have an Export button that downloads a CSV file that opens in Excel: provider, type, region, stages, cheque range, fit and why it fits, contact routes where known, pipeline stage, next action, notes and dates.',
    },
    cr && {
      q: 'How are matches refreshed?',
      a: 'Once a month, Capital Raising re-runs your matches with your current company details and shows what changed since the last run: new fits, removed fits and fits whose level changed. You can still re-run them yourself at any time.',
    },
    paid && {
      q: 'How does the credit work?',
      a: `If you bought a Capital Readiness Report or Capital Readiness + Advisor and move to Capital Raising within ${paid.credit.window_days} days, ${money(paid.credit.amount_usd)} counts toward it, monthly or yearly. For Capital Readiness + Advisor, ${money(paid.credit.amount_usd)} is credited and the advisor session is not. It is the only credit, it applies once, and it does not apply to Company Intelligence.`,
    },
    days && {
      q: `What are the ${days} days of Company Intelligence?`,
      a: `Both Capital Readiness services include ${days} days of Company Intelligence from the day you buy. After that your report stays yours; the live layer continues only if you choose a plan.`,
    },
    cr && ci && {
      q: 'What happens when my raise ends?',
      a: `You step down to Company Intelligence${ci.prices?.[0] ? ` (${priceLine(ci.prices[0])})` : ''} and keep all your data. A monthly or yearly plan steps down at the end of the period you have paid for. You can also step down to Free.`,
    },
    cr && {
      q: 'Can I pay yearly?',
      a: `Yes. Company Intelligence and Capital Raising can be paid monthly or yearly, and yearly is 10 months' price for 12 months of access: two months free.${crPrices ? ` Capital Raising is ${crPrices}.` : ''}`,
    },
    {
      q: 'Which currency?',
      a: `All prices are in ${data?.currency || 'USD'}, everywhere.${refund?.days ? ` ${cleanCopy(refund.label) || `${refund.days}-day refund on your first payment`}.` : ''}`,
    },
  ].filter(Boolean);
  return (
    <section className="pr2-faq" aria-labelledby="pr2-faq-h">
      <h2 id="pr2-faq-h" className="pr2-h2">Questions</h2>
      {items.map((it) => (
        <details key={it.q} className="pr2-faq-item">
          <summary>{it.q}<Icon name="chevronDown" /></summary>
          <p>{it.a}</p>
        </details>
      ))}
    </section>
  );
}
