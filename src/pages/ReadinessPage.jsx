import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { ReadinessSnapshot, FactorBars } from '../components/capital/Readiness';
import ReadinessQuestionnaire from '../components/capital/ReadinessQuestionnaire';
import { conncctLink } from '../lib/companies';
import { expertiseForFactor } from '../lib/actions';
import { LoadError } from '../components/capital/bits';

export default function ReadinessPage() {
  const { company, companyId, readiness, readinessLoading, readinessError, reloadCompanies } = useCompany();
  const [retake, setRetake] = useState(false);
  const [fresh, setFresh] = useState(null);
  const r = fresh || readiness?.readiness;
  const href = conncctLink(company, 'readiness');

  return (
    <div>
      <SubNav section="capital" />
      <PageHeader
        title="Capital readiness"
        subtitle="Conncct's 14-factor view of how ready your company is to raise. It's about your company, not any one investor."
        actions={<Button as="a" href={href} target="_blank" rel="noreferrer" variant="secondary" size="sm">Open in Conncct ↗</Button>}
      />
      {readinessLoading ? <Skeleton h="280px" /> : readinessError ? <LoadError error={readinessError} what="your readiness" /> : (
        <div className="ready-grid">
          <Card id="readiness" className="ready-main" title="Readiness · from Conncct">
            {r ? (
              <>
                <ReadinessSnapshot readiness={r} variant="full" conncctHref={href} />
                <FactorBars readiness={r} />
              </>
            ) : (
              <EmptyState compact icon="gauge" title="Not yet scored in Conncct." body="Answer Conncct's 14 questions to get your readiness score." action={<Button variant="accent" onClick={() => setRetake(true)}>Start the questions</Button>} />
            )}
          </Card>
          <div className="ui-stack">
            {r?.blockers?.length > 0 && (
              <Card title="Holding the score back">
                <ul className="plain-list">{r.blockers.map((b) => <li key={b.code}><Badge tone="warn" size="sm">Conncct</Badge> {b.message}</li>)}</ul>
              </Card>
            )}
            <Card title="Conncct suggests">
              {r?.improvements?.length ? (
                <ul className="improve-list">
                  {r.improvements.slice(0, 5).map((imp, i) => {
                    const skill = expertiseForFactor(imp.factor);
                    return (
                      <li key={`${imp.factor}-${i}`}>
                        <p className="improve-action">{imp.action}</p>
                        <p className="ui-muted">
                          {imp.label || imp.factor}{imp.impact_points ? ` · Conncct estimate +${imp.impact_points}` : ''}{imp.effort ? ` · effort ${imp.effort}` : ''}
                        </p>
                        {skill && <Link className="nba-expert" to={`/experts?skill=${encodeURIComponent(skill)}&factor=${imp.factor}`}>Need help? Find a matched {skill.toLowerCase()} expert →</Link>}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="ui-muted">No suggestions from Conncct yet.</p>}
            </Card>
            <Card title="Retake the questions" subtitle="Your answers go to the Conncct engine. Only Conncct scores readiness.">
              {retake ? (
                <ReadinessQuestionnaire companyId={companyId} onCancel={() => setRetake(false)}
                  onScored={(out) => { setFresh(out.readiness || null); setRetake(false); reloadCompanies(); }} />
              ) : <Button variant="secondary" onClick={() => setRetake(true)}>Update my answers</Button>}
            </Card>
          </div>
        </div>
      )}
      {fresh && <Alert tone="ok">Your new readiness score is in. It replaces the earlier snapshot.</Alert>}
    </div>
  );
}
