import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, PageHeader, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import ExpertBridgeLink from '../components/ExpertBridgeLink';
import { useCompany } from '../components/company-context';
import { ReadinessSnapshot, FactorBars } from '../components/capital/Readiness';
import { LoadError } from '../components/capital/bits';
import { readinessSource, readinessGaps, factorName, notAsked } from '../lib/readiness';
import { fmtDate } from '../lib/format';

const WHO = { founder: 'you', expert: 'an expert', conncct_service: 'a readiness partner' };

/** 15 · Capital readiness: the winning snapshot, gaps, all factors, history. */
export default function ReadinessPage() {
  const { company, readiness, readinessLoading, readinessError } = useCompany();
  const [showAll, setShowAll] = useState(false);
  const r = readiness?.readiness;
  const src = readinessSource(readiness);
  const bridge = r && src.key === 'conncct';
  const gaps = readinessGaps(r);
  const shownGaps = showAll ? gaps : gaps.slice(0, 3);
  const dilution = (r?.blockers || []).find((b) => b.code === 'dilution_over_100');

  const head = (
    <>
      <SubNav section="capital" />
      <PageHeader title="Capital readiness" subtitle={company.name}
        actions={bridge
          ? null
          : r ? <Button as={Link} to="/capital/readiness/assess" variant="secondary" size="sm">{r.provisional ? 'Finish the questions' : 'Update my answers'}</Button> : null} />
    </>
  );

  if (readinessLoading) return <div>{head}<Skeleton h="300px" /></div>;
  if (readinessError) return <div>{head}<LoadError error={readinessError} what="your readiness" /></div>;
  if (!r) {
    return (
      <div>{head}
        <EmptyState icon="gauge" title={`How ready is ${company.name} to raise?`}
          body="Answer a short set of questions about your runway, raise, revenue and team. It takes about 5 minutes. You'll get a Capital Readiness Score (Conncct method) and the three gaps worth closing first."
          action={(
            <div className="ui-stack ui-stack-sm" style={{ justifyItems: 'center' }}>
              <Button as={Link} to="/capital/readiness/assess" variant="accent">Get your score</Button>
            </div>
          )} />
        <p className="ui-faint" style={{ textAlign: 'center' }}>Investors read this before they read your deck. It also decides which help we suggest.</p>
      </div>
    );
  }

  return (
    <div className="readiness">
      {head}
      <Card className="ready-top">
        <ReadinessSnapshot readiness={r} variant="full" conncctHref={bridge || null} source={readiness} />
      </Card>
      {dilution && <Alert tone="bad">Your raise is larger than your valuation. Investors will flag this.</Alert>}
      <Card id="gaps" title="Your gaps" subtitle="Suggestions from the readiness method, most important first.">
        {gaps.length ? (
          <ol className="gaps">
            {shownGaps.map((g, i) => {
              const f = r.factors?.find((x) => x.key === g.factor);
              const ratio = f?.max ? Number(f.points) / Number(f.max) : null;
              const showBridge = g.who !== 'founder' || (ratio !== null && ratio < 0.4);
              return (
                <li key={`${g.factor}-${i}`} className="gap">
                  <div className="gap-head">
                    <strong>{factorName(f || g)}</strong>
                    {f && <span className="gap-pts">{notAsked(f) ? (src.key === 'embedded' ? <Link to="/capital/readiness/assess">Not asked yet: answer it</Link> : 'Not asked yet') : `${f.points} of ${f.max}`}</span>}
                  </div>
                  <p>Suggested: “{g.action}”</p>
                  <p className="ui-muted">{g.impact_points ? `Could add up to ${g.impact_points} points` : ''}{g.who ? `${g.impact_points ? ' · ' : ''}Who: ${WHO[g.who] || g.who}` : ''}</p>
                  {showBridge && <ExpertBridgeLink kind="readiness_factor" gapKey={g.factor} from="readiness" />}
                </li>
              );
            })}
          </ol>
        ) : <p className="ui-muted">No gaps flagged.</p>}
        {gaps.length > 3 && <Button variant="link" size="sm" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${gaps.length}`}</Button>}
      </Card>
      <Card title="All factors">
        <FactorBars readiness={r} />
        {(readiness.history || []).length > 1 && (
          <p className="ui-muted ready-history">History: {readiness.history.slice().reverse().map((h) => `${fmtDate(h.computed_at)} ${h.score}`).join(' · ')}</p>
        )}
      </Card>
      <p className="ui-faint">Investors read this before they read your deck. It also decides which help we suggest.</p>
    </div>
  );
}
