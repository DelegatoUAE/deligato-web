import { Link } from 'react-router-dom';
import { Button } from '../../design/ui';
import { READINESS_AREAS } from '../../lib/readiness-areas';

/**
 * Before the first readiness answer (11 Oct, Conncct AI-Scorecard pattern): what the founder
 * gets, how long it takes, the areas it covers, and one primary action.
 */
export default function ReadinessIntro({ company }) {
  return (
    <div className="rintro">
      <header className="rintro-head">
        <span className="mx-rule" aria-hidden="true" />
        <h1>How ready is {company.name} to raise?</h1>
        <p className="rintro-lede">Answer short questions about your runway, raise, revenue and team. You get a Capital Readiness Score (Conncct method) and the three gaps worth closing first.</p>
        <ul className="wh-assure">
          <li>About 5 minutes</li>
          <li>One question at a time; we save as you go</li>
          <li>Answers stay private to {company.name}</li>
        </ul>
      </header>
      <section className="rintro-card" aria-labelledby="rintro-areas">
        <h2 id="rintro-areas">What it looks at</h2>
        <ul className="rintro-areas">
          {READINESS_AREAS.map((a) => (
            <li key={a.key}><strong>{a.label}</strong><span>{a.body}</span></li>
          ))}
        </ul>
        <div className="rintro-cta">
          <Button as={Link} to="/capital/readiness/assess" variant="primary" size="lg" iconRight="arrowRight">Start the questions</Button>
          <p>Investors look for the same things. It also decides which help we suggest.</p>
        </div>
      </section>
    </div>
  );
}
