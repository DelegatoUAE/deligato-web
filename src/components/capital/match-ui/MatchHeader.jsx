import { companyLine } from '../../../lib/company-line.js';

/** Page header for the capital matching screens: a short gold rule, the title, one line of context. */
export default function MatchHeader({ title = 'Capital matches', company, lede, actions = null }) {
  return (
    <header className="mx-head">
      <div className="mx-head-text">
        <span className="mx-rule" aria-hidden="true" />
        <h1 className="mx-title">{title}</h1>
        <p className="mx-lede">{lede ?? companyLine(company)}</p>
      </div>
      {actions && <div className="mx-head-meta">{actions}</div>}
    </header>
  );
}
