import { Fragment, useState } from 'react';
import { Badge, Icon } from '../../design/ui';
import { advisoryLabel } from '../../lib/plan';
import {
  cleanCopy, compareCell, compareOf, isLaunching, money, PLAN_STORY, planBullets, platformOf, priceFor, priceLine, priceParts, servicesOf, serviceTerms,
} from '../../lib/pricing';
import './pricing.css';

/**
 * D73 pricing: three platform plans (Free · Capital Intelligence · Capital Raising) and two one-time
 * Capital Readiness services shown apart. Every price, label and limit comes from the API
 * (GET /billing/plans, plus GET /packages/catalog for a D73 plan the price list does not price yet);
 * the card words are lib/pricing D73 bullets, each reading an API value. `cta(plan, price, story)`
 * renders each action, so the public page and the signed-in Plans page keep their own behaviour.
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
export function PlatformPlans({ data, catalog = null, cta, billing = 'monthly', isCurrent = () => false, highlight }) {
  const plans = platformOf(data, catalog);
  return (
    <>
    <div className="pr2-plans" role="list" aria-label="Platform plans">
      {plans.map((plan, i) => {
        const story = PLAN_STORY[plan.id] || {};
        const price = priceFor(plan, billing);
        const tone = plan.id === 'capital-raising' ? 'raise' : plan.id === 'capital-intelligence' ? 'intel' : 'free';
        return (
          <Fragment key={plan.id}>
            {i > 0 && <span className="pr2-link" aria-hidden="true"><Icon name="arrowRight" /></span>}
            <article role="listitem" aria-labelledby={`pr2-${plan.id}`}
              className={`pr2-card pr2-card-${tone}${isCurrent(plan) ? ' is-current' : ''}${highlight === plan.id ? ' is-hl' : ''}`}>
              <header className="pr2-card-head">
                <div className="pr2-card-top">
                  <p className="pr2-label">{cleanCopy(plan.tagline) || story.label}</p>
                  {plan.badge && <span className="pr2-badge">{cleanCopy(plan.badge)}</span>}
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
    <p className="pr2-boundary">Every plan includes ranked investor and capital-provider matches. Plans differ in how many you see, how deep the explanations go, your shortlist and active pipeline, outreach, AI, data room and expert time.</p>
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
export function ServicesSection({ data, cta, isCurrent = () => false, highlight, included = false }) {
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
          {/* D73: a plan that includes the report is never prompted to buy it. */}
          <div className="pr2-svc-cta">{included ? <p className="pr2-svc-included"><Badge tone="ok">Included in your plan</Badge> Your plan already includes the Capital Readiness Report.</p> : cta(plan, price, story)}</div>
        </div>
      </article>
    </section>
  );
}

/** "Compare what's included": the API's groups and labels, each plan's own values (lib/pricing compareOf). */
export function CompareTable({ data, catalog = null }) {
  if (!data?.compare || !Array.isArray(data.compare.groups)) return null;
  const cmp = compareOf(data, catalog);
  const names = cmp.names;
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
                            : c.kind === 'pending' ? <><span aria-hidden="true">*</span><span className="ui-sr">Not published yet</span></>
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
      {cmp.pending && <p className="pr2-compare-foot">* Published here when checkout opens for this plan.</p>}
    </section>
  );
}

/** The short FAQ (D73: matches on every plan, limits, history, data room, expert time, credit, yearly, USD). */
export function PricingFaq({ data, catalog = null }) {
  const plans = platformOf(data, catalog);
  const free = plans.find((p) => p.id === 'readiness-free');
  const ci = plans.find((p) => p.id === 'capital-intelligence');
  const cr = plans.find((p) => p.id === 'capital-raising');
  const paid = servicesOf(data).find((p) => p.credit);
  const days = servicesOf(data).find((p) => p.includes_company_intelligence_days)?.includes_company_intelligence_days;
  const refund = data?.refund;
  const shown = (p, k) => (p?.display?.[k] && !/^not included$/i.test(p.display[k]) ? cleanCopy(p.display[k]).replace(/^Up to/, 'up to') : null);
  const items = [
    free && shown(free, 'max_results') && {
      q: 'Does Free include investor matching?',
      a: `Yes. Free shows your top ranked matches (${shown(free, 'max_results')} per run) with basic explanations. Contact routes, outreach and an active pipeline start on ${ci ? ci.name : 'the paid plans'}.`,
    },
    (ci || cr) && {
      q: 'What counts toward my pipeline limit?',
      a: 'Only active opportunities: intro requested, contacted, in conversation, diligence and term sheet. Closed, passed and rejected investors stay in your history, never count, and free a slot. Nothing is deleted when you reach a limit or change plan.',
    },
    cr && {
      q: 'Can I share my data room with investors?',
      a: 'Not yet. Your data room is private document storage: you upload, view, replace and delete your fundraising documents, and only your company can open them. Investor guest access (invite links, permissions and activity) is coming later.',
    },
    (ci || cr) && {
      q: 'What is the expert time in my plan?',
      a: `Paid plans include time with an advisor each subscription year: ${[ci, cr].filter(Boolean).map((p) => `${p.name}, ${advisoryLabel(p.entitlements?.advisory_minutes_per_year ?? p.display?.advisory_minutes_per_year) || 'none'}`).join('; ')}. You book it from Settings, Plan and billing. Yearly plans get it, and the Capital Readiness Report, from day one; on monthly billing the report opens after your first renewal and expert time from your third paid month. It is separate from the one-time Capital Readiness services.`,
    },
    cr && {
      q: 'Can I export my matches and pipeline?',
      a: `Yes, on ${cr.name}. Matches, Shortlist and Pipeline each have an Export button that downloads a CSV file that opens in Excel.`,
    },
    paid && {
      q: 'How does the credit work?',
      a: `If you bought a Capital Readiness Report or Capital Readiness + Advisor and move to Capital Raising within ${paid.credit.window_days} days, ${money(paid.credit.amount_usd)} counts toward it, monthly or yearly. For Capital Readiness + Advisor, ${money(paid.credit.amount_usd)} is credited and the advisor session is not. It applies once. Moving up from ${ci ? ci.name : 'Capital Intelligence'} to Capital Raising, the unused part of your current plan is credited by our payment provider.`,
    },
    days && {
      q: `What are the ${days} days included with the report?`,
      a: `Both Capital Readiness services include ${days} days of the Company Intelligence live layer (what changed and what needs attention) from the day you buy. After that your report stays yours.`,
    },
    (ci || cr) && {
      q: 'Can I pay yearly?',
      a: `Yes. ${[ci, cr].filter(Boolean).map((p) => `${p.name} is ${(p.prices || []).filter((x) => ['monthly', 'annual'].includes(x.billing)).map(priceLine).join(' or ')}`).join('. ')}. Yearly is 10 months' price for 12 months of access: two months free.`,
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
