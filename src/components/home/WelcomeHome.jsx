import { Link } from 'react-router-dom';
import { Button, Icon } from '../../design/ui';
import { partOfDay } from '../../lib/home';

const PATH = [
  { title: 'Set up your company', body: 'Name, headquarters, stage and sector, plus any traction you want to share.', icon: 'building' },
  { title: 'Check your readiness', body: 'A short questionnaire scored with the Conncct method, with the gaps worth closing first.', icon: 'gauge' },
  { title: 'Find capital', body: 'Which kinds of capital fit your company, then the providers whose mandates fit.', icon: 'compass' },
];

/**
 * Home for a founder with no company yet (11 Oct, Bilal: "a real welcome, not an empty box").
 * The path is a real sequence, so it is numbered; only step 1 is actionable.
 */
export default function WelcomeHome({ name, staff = false }) {
  return (
    <div className="welcome-home">
      <header className="wh-intro">
        <span className="mx-rule" aria-hidden="true" />
        <h1>{name ? `Good ${partOfDay()}, ${name}.` : `Good ${partOfDay()}.`}</h1>
        <p className="wh-lede">Three steps take you from your company's facts to the capital that fits it. Start with the first; the others open as you go.</p>
        <ul className="wh-assure">
          <li>About 3 minutes</li>
          <li>Your company's data stays private to your team</li>
          <li>Change any answer later</li>
        </ul>
      </header>

      <section className="wh-path" aria-labelledby="wh-path-h">
        <h2 id="wh-path-h" className="wh-path-h">Your path</h2>
        <ol className="wh-steps">
          {PATH.map((s, i) => (
            <li key={s.title} className={`wh-step${i === 0 ? ' is-current' : ''}`}>
              <span className="wh-n" aria-hidden="true">{i + 1}</span>
              <div className="wh-step-text">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {i === 0 && (
                  <div className="wh-cta">
                    <Button as={Link} to="/onboarding" variant="primary" size="lg" iconRight="arrowRight">Set up your company</Button>
                    {staff && import.meta.env.DEV && import.meta.env.VITE_DEV_IMPORT === 'true' && <Button as={Link} to="/dev/import" variant="secondary">Import a test company</Button>}
                  </div>
                )}
                {i > 0 && <span className="wh-later"><Icon name="lock" size={12} />Opens after step {i}</span>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="wh-expert">Looking for an expert instead? <Link to="/experts">Find an Expert</Link></p>
    </div>
  );
}
