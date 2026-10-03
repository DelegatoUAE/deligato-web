import { useState } from 'react';
import { Badge, Icon } from '../../design/ui';
import { cleanCopy, columnsOf, foundingLabel, isLaunching, LIMIT_ROWS, limitLabel, money, priceLine, priceParts, stageOf } from '../../lib/pricing';
import './billing.css';

const SHOWN = 6;

/**
 * The five columns (D60): Free · Capital Readiness · Capital Readiness Plus ·
 * Company Intelligence · Capital Raising, every price and label from GET /billing/plans.
 * `cta(plan, price)` renders each column's action (public page and in-app page differ).
 */
export default function PlanColumns({ data, cta, highlight, star, isCurrent = () => false }) {
  const cols = columnsOf(data);
  return (
    <div className="pr-cols" role="list">
      {cols.map((p) => <Column key={p.id} plan={p} data={data} cta={cta} highlight={p.id === highlight} star={p.id === star} current={isCurrent(p)} />)}
    </div>
  );
}

function Column({ plan, data, cta, highlight, star, current }) {
  const [open, setOpen] = useState(false);
  const [main, ...alts] = plan.prices;
  const { amount, cadence } = priceParts(main);
  const founding = plan.id === 'capital-raising' ? foundingLabel(plan, data.price_version_label) : null;
  const includes = (plan.includes || []).map(cleanCopy).filter(Boolean)
    // shown once, as the highlight line and the credit note below
    .filter((x) => !(plan.includes_company_intelligence_days && /days of Company Intelligence$/i.test(x)));
  const shown = open ? includes : includes.slice(0, SHOWN);
  const lead = plan.id === 'capital-raising';
  const limits = plan.limits ? LIMIT_ROWS.filter(([k]) => k in plan.limits && !/^not included$/i.test(plan.limits[k])) : [];
  return (
    <article role="listitem" className={`pr-col${lead ? ' is-lead' : ''}${highlight ? ' is-hl' : ''}${current ? ' is-current' : ''}`} aria-labelledby={`pr-${plan.id}`}>
      <header className="pr-col-head">
        <p className="pr-stage">{stageOf(plan.id) || cleanCopy(plan.tagline)}</p>
        <h3 id={`pr-${plan.id}`} className="pr-name">
          {plan.name}
          {star && <span className="pr-star" aria-label="Recommended for you"> ★</span>}
        </h3>
        <div className="pr-price">
          <span className="pr-amount">{amount}</span>
          {cadence && <span className="pr-cadence">{cadence}</span>}
        </div>
        {founding ? <p className="pr-founding"><strong>{founding.split(':')[0]}:</strong>{founding.slice(founding.indexOf(':') + 1)}</p>
          : main.note ? <p className="pr-note">{cleanCopy(main.note)}</p> : null}
        {alts.length > 0 && !founding && (
          <ul className="pr-alts">{alts.map((a) => <li key={a.key}>or {priceLine(a)}{a.note ? <span className="pr-alt-note"> · {cleanCopy(a.note)}</span> : null}</li>)}</ul>
        )}
        <p className="pr-tag">{cleanCopy(plan.tagline)}</p>
      </header>

      <div className="pr-cta">{cta(plan, main)}</div>

      <div className="pr-col-body">
      {plan.includes_company_intelligence_days ? (
        <p className="pr-bridge"><Icon name="spark" /> Includes {plan.includes_company_intelligence_days} days of Company Intelligence</p>
      ) : null}

      <ul className="pr-incl">
        {shown.map((x) => (
          <li key={x}><Icon name="check" /><span>{x}{isLaunching(x) && <> <Badge tone="outline" size="sm">Launching</Badge></>}</span></li>
        ))}
      </ul>
      {includes.length > SHOWN && (
        <button type="button" className="pr-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : `Show all ${includes.length}`}<Icon name="chevronDown" />
        </button>
      )}

      {limits.length > 0 && (
        <dl className="pr-limits">
          {limits.map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{limitLabel(plan.limits[k])}</dd></div>)}
        </dl>
      )}

      {lead && <p className="pr-dealroom"><strong>Living Deal Room</strong> <Badge tone="outline" size="sm">Launching</Badge><span>Investor-specific secure access goes live when secure storage and email are switched on.</span></p>}
      </div>
    </article>
  );
}

/** The optional Expert / Advisor branch (D50): beside the plans, never a step, never checkout. */
export function OptionalSupport({ data, action }) {
  const s = data?.optional_support;
  return (
    <section className="pr-optional" aria-labelledby="pr-opt-h">
      <div>
        <p className="pr-stage">Optional</p>
        <h3 id="pr-opt-h" className="pr-name">{cleanCopy(s?.label) || 'Need specialist help?'}</h3>
        <p className="pr-tag">Find vetted experts for a specific gap, or book advisor time. Priced separately and entirely optional: every plan above works without it.</p>
      </div>
      {action}
    </section>
  );
}

/** The short FAQ (credit rule, 30-day inclusion, step-down, no annual Capital Raising, USD). */
export function PricingFaq({ data }) {
  const cols = columnsOf(data);
  const cr = cols.find((p) => p.id === 'capital-raising');
  const ci = cols.find((p) => p.id === 'company-intelligence');
  const paid = cols.find((p) => p.credit);
  const days = cols.find((p) => p.includes_company_intelligence_days)?.includes_company_intelligence_days;
  const crPrices = (cr?.prices || []).map(priceLine).join(' or ');
  const refund = data?.refund;
  const items = [
    paid && {
      q: 'How does the credit work?',
      a: `If you bought a Capital Readiness report and move to Capital Raising within ${paid.credit.window_days} days, ${money(paid.credit.amount_usd)} counts toward it. For Capital Readiness Plus, ${money(paid.credit.amount_usd)} is credited and the human-review part is not. It is the only credit, it applies once, and it does not apply to Company Intelligence.`,
    },
    days && {
      q: 'What are the 30 days of Company Intelligence?',
      a: `Both Capital Readiness reports include ${days} days of Company Intelligence from the day you buy. After that your report stays yours; the live layer continues only if you choose a plan.`,
    },
    cr && ci && {
      q: 'What happens when my raise ends?',
      a: `You step down to Company Intelligence${ci.prices?.[0] ? ` (${priceLine(ci.prices[0])})` : ''} and keep all your data. A monthly plan steps down at the end of the period you have paid for; a Raise Pass simply ends. You can also step down to Free.`,
    },
    cr && {
      q: 'Is there an annual Capital Raising plan?',
      a: `No. Capital Raising is ${crPrices || 'monthly or a 6-month Raise Pass'}. Raises have a start and an end, so you pay for the months you are raising.`,
    },
    {
      q: 'Which currency?',
      a: `All prices are in ${data?.currency || 'USD'}, everywhere.${refund?.days ? ` ${cleanCopy(refund.label) || `${refund.days}-day refund on your first payment`}.` : ''}`,
    },
  ].filter(Boolean);
  return (
    <section className="pr-faq" aria-labelledby="pr-faq-h">
      <h2 id="pr-faq-h" className="pr-h2">Questions</h2>
      {items.map((it) => (
        <details key={it.q} className="pr-faq-item">
          <summary>{it.q}<Icon name="chevronDown" /></summary>
          <p>{it.a}</p>
        </details>
      ))}
    </section>
  );
}
