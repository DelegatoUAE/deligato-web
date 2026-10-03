import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Skeleton, StatTile } from '../design/ui';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getUnlocks, listRuns, getRunNormalised, stageLabel } from '../lib/capital';
import { getRecommendation } from '../lib/packages';
import { getRouting, normaliseRoute } from '../lib/routing';
import { listExpertRequests } from '../lib/experts';
import { fmtUsd, fmtPrice, fmtInt, firstName, humanise, daysSince, countryName, POSITIONING } from '../lib/format';
import { rankActions, partOfDay, pipelineCounts } from '../lib/home';
import { bandLabel, readinessSource, readinessGaps } from '../lib/readiness';
import NextActions from '../components/capital/NextActions';
import MatchRow from '../components/capital/MatchRow';
import { FundraisingNotice, GateCard, LoadError } from '../components/capital/bits';
import { logEvent } from '../lib/events';

const ACTIVE = ['researching', 'intro_requested', 'contacted', 'in_conversation', 'diligence', 'term_sheet'];
const TIMING = { now: 'Raising now', '0_3m': 'In 0–3 months', '3_6m': 'In 3–6 months', '6_12m': 'In 6–12 months', exploring: 'Exploring' };
const DISMISS_KEY = 'conncct.home.dismissed';
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function readDismissed() {
  try {
    const all = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
    return new Set(Object.entries(all).filter(([, until]) => until > Date.now()).map(([k]) => k));
  } catch { return new Set(); }
}

/** K3 "+N since {weekday}": verified-eligible records in the latest run that weren't in the previous one. */
async function strongDelta(companyId, latest) {
  if (!latest) return null;
  const { runs } = await listRuns(companyId);
  const sorted = (runs || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sorted.length < 2) return null;
  const prev = await getRunNormalised(sorted[1].id);
  const before = new Set(prev.results.filter((r) => r.bucket === 'eligible').map((r) => r.record_id));
  const n = latest.results.filter((r) => r.bucket === 'eligible' && !before.has(r.record_id)).length;
  return { n, since: WEEKDAY[new Date(sorted[1].created_at).getDay()] };
}

function Waiting({ staff, name }) {
  return (
    <div className="home-wait">
      <h1 className="home-greet">{name ? `Good ${partOfDay()}, ${name}.` : `Good ${partOfDay()}.`}</h1>
      <p className="home-positioning">{POSITIONING}</p>
      <EmptyState icon="building" title="Let's start with your company."
        body="Three minutes of facts about your company. Then we score your readiness, show which kinds of capital fit, and match you with providers."
        action={(
          <div className="ui-stack ui-stack-sm" style={{ justifyItems: 'center' }}>
            <div className="ui-row">
              <Button as={Link} to="/onboarding" variant="accent">Set up your company</Button>
              {staff && (import.meta.env.DEV && import.meta.env.VITE_DEV_IMPORT === 'true') && <Button as={Link} to="/dev/import" variant="secondary">Import a test company</Button>}
            </div>
            <Link to="/experts">Looking for an expert instead? Find an Expert →</Link>
          </div>
        )} />
    </div>
  );
}

/** 00 · Home: the command centre. Every block loads and fails on its own. */
export default function DashboardPage() {
  const { me, staff, company, companyId, companiesLoading, readiness, readinessLoading, readinessError, reloadReadiness,
    run, runLoading, capitalNeedConfirmed, pipeline, pipelineError, reloadPipeline } = useCompany();
  const unlocksQ = useApi(() => (companyId && run ? getUnlocks(companyId) : null), [companyId, run?.run_id]);
  const deltaQ = useApi(() => (companyId && run ? strongDelta(companyId, run) : null), [companyId, run?.run_id]);
  const routesQ = useApi(() => (companyId ? getRouting(companyId) : null), [companyId]);
  const recQ = useApi(() => (companyId ? getRecommendation(companyId, company?.raise_timing) : null), [companyId]);
  const expQ = useApi(() => (companyId ? listExpertRequests(companyId).then((x) => x.requests || []).catch(() => []) : []), [companyId]);
  const [dismissed, setDismissed] = useState(readDismissed);

  const name = firstName(me?.profile?.full_name || me?.user?.user_metadata?.full_name);
  if (companiesLoading) {
    return (
      <div className="dash-skel" aria-busy="true" aria-label="Loading your command centre">
        <Skeleton w="55%" h="34px" /><Skeleton w="30%" h="14px" />
        <div className="dash-skel-tiles">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h="118px" r="12px" />)}</div>
        <Skeleton h="200px" r="12px" />
      </div>
    );
  }
  if (!company) return <Waiting staff={staff} name={name} />;

  const r = readiness?.readiness || null;
  const src = readinessSource(readiness);
  const pipelineGated = pipelineError?.status === 402;
  const active = pipeline ? pipeline.filter((p) => ACTIVE.includes(p.stage)) : null;
  const staleN = active ? active.filter((p) => daysSince(p.stage_entered_at || p.updated_at) > 21).length : 0;
  // I-01: the same three evidence-tier counts as Capital overview and Matches (D24),
  // from the whole run (a trial sees only its top 5 results).
  const bucket = (k) => run?.counts?.[`${k}_bucket`] ?? run?.results.filter((x) => x.bucket === k).length ?? 0;
  const pc = pipelineCounts(pipeline);
  const gapList = r ? readinessGaps(r) : [];
  const gaps = gapList.length;
  const biggestLabel = gapList[0] ? (r.factors?.find((f) => f.key === gapList[0].factor)?.label || gapList[0].label || humanise(gapList[0].factor)) : null;

  const actions = rankActions({
    raiseTiming: company.raise_timing,
    readiness: r,
    readinessSource: src.key,
    capitalNeedConfirmed,
    hasRun: Boolean(run),
    pipeline: (pipeline || []).map((p) => ({ ...p, name: p.capital_sources?.name })),
    unlocks: unlocksQ.data,
    newStrong: deltaQ.data,
    questionCount: null,
    dismissed,
  });

  function dismiss(a) {
    const key = `${a.pool}:${a.key}`;
    try {
      const all = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
      all[key] = Date.now() + 7 * 86400000;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(all));
    } catch { /* hidden for this visit only */ }
    setDismissed((s) => new Set([...s, key]));
    logEvent('home.action_dismissed', { pool: a.pool, key: a.key }, companyId);
  }

  const routes = (routesQ.data?.routes || []).map((x) => ({ ...normaliseRoute(x), level: x.coverage?.level }));
  const fits = routes.filter((x) => x.fit === 'strong');
  const worth = routes.filter((x) => x.fit === 'possible');
  const thin = routes.filter((x) => x.fit !== 'unlikely' && x.level === 'thin');
  const rec = recQ.data;
  const recItem = rec?.recommended_code ? rec.ranked?.find((x) => x.id === rec.recommended_code) : null;
  const expert = (expQ.data || []).find((x) => x.consultant_id || x.status !== 'cancelled');

  return (
    <div className="home">
      <header className="home-head">
        <h1>{name ? `Good ${partOfDay()}, ${name}.` : `Good ${partOfDay()}.`} Here's where your company stands.</h1>
        <p className="home-sub">{[company.name, company.stage || 'stage unknown', company.sector || 'sector unknown', countryName(company.hq_country_iso2) || 'HQ unknown'].join(' · ')}</p>
      </header>

      <section className="home-stats" aria-label="Where you stand">
        {readinessError ? (
          <div className="ui-stat"><div className="ui-stat-label">Readiness</div><div className="ui-stat-value ui-stat-value-text">Couldn't load</div><Button variant="link" size="sm" onClick={reloadReadiness}>Retry</Button></div>
        ) : (
          <StatTile as={Link} to={r ? '/capital/readiness' : '/capital/readiness/assess'} tone="navy" label="Readiness" loading={readinessLoading}
            value={r ? Math.round(Number(r.score)) : 'Not scored yet'} foot={r ? `${bandLabel(r)} · ${src.label}` : 'Get your score'} />
        )}
        <StatTile as={Link} to="/capital/need" label="Current raise" value={company.raise_usd != null ? fmtUsd(company.raise_usd) : 'Not set'}
          foot={[company.instrument, TIMING[company.raise_timing] || (capitalNeedConfirmed ? 'timing not set' : 'Confirm your raise')].filter(Boolean).join(' · ')} />
        <StatTile as={Link} to={run ? '/capital/matches?evidence=eligible' : '/capital/find'} label="Verified fits" loading={runLoading}
          value={run ? fmtInt(bucket('eligible')) : 'Not yet'} foot={!run ? 'Appears after your first match' : `${deltaQ.data?.n ? `+${deltaQ.data.n} since ${deltaQ.data.since} · ` : ''}${fmtInt(bucket('possible'))} possible · ${fmtInt(bucket('likely_outside'))} likely outside`} />
        {pipelineGated ? (
          <StatTile as={Link} to="/packages?highlight=investor-ready" label="In pipeline" value="Locked" foot="Included from Investor-Ready" />
        ) : pipelineError ? (
          <div className="ui-stat"><div className="ui-stat-label">In pipeline</div><div className="ui-stat-value ui-stat-value-text">Couldn't load</div><Button variant="link" size="sm" onClick={reloadPipeline}>Retry</Button></div>
        ) : (
          <StatTile as={Link} to="/capital/pipeline" label="In pipeline" loading={!pipeline}
            value={pipeline ? pc.inPipeline : ''} foot={!pipeline ? '' : `${pc.saved} saved${pc.inPipeline === 0 ? ' · starts when you add a match' : staleN ? ` · ${staleN} need a reply` : ' · all up to date'}`} />
        )}
        <StatTile as={Link} to="/capital/readiness#gaps" label="Readiness gaps" loading={readinessLoading}
          value={r ? gaps : 'Not scored yet'} foot={!r ? 'Appears after scoring' : gaps === 0 ? 'No gaps flagged' : biggestLabel ? `First: ${biggestLabel}` : 'factors to strengthen'} />
      </section>

      <section className="home-actions" aria-labelledby="nba-h">
        <h2 id="nba-h">Your next best actions</h2>
        {runLoading || readinessLoading || !pipeline ? <Skeleton h="180px" /> : actions.length ? <NextActions actions={actions} company={company} onDismiss={dismiss} /> : (
          <p className="ui-muted">You're up to date. Review your matches or add to your data room. <Link to="/capital/matches">See matches</Link></p>
        )}
      </section>

      <div className="home-grid">
        <Card title="Capital routes" action={<Button as={Link} to="/capital/find" variant="link" size="sm">Find capital</Button>}>
          {routesQ.error ? <LoadError error={routesQ.error} onRetry={routesQ.reload} what="your routes" /> : !routesQ.data ? <Skeleton h="80px" /> : !capitalNeedConfirmed && !company.raise_usd ? (
            <p className="ui-muted">Confirm your raise to see which kinds of capital fit. <Link to="/capital/need">Confirm your raise</Link></p>
          ) : (
            <dl className="routes-mini">
              {fits.length > 0 && <div><dt>Fits you</dt><dd>{fits.slice(0, 4).map((x) => x.label).join(' · ')}</dd></div>}
              {worth.length > 0 && <div><dt>Worth a look</dt><dd>{worth.slice(0, 3).map((x) => x.label).join(' · ')}</dd></div>}
              {thin.length > 0 && <div><dt>Thin coverage</dt><dd>{thin.slice(0, 2).map((x) => x.label).join(' · ')}</dd></div>}
              {!fits.length && !worth.length && <div><dt>Not enough to tell</dt><dd>{routesQ.data.capital_filter?.note}</dd></div>}
              {routesQ.data.ordering?.key === 'ownership_first' && <p className="ui-faint">{routesQ.data.ordering.text}</p>}
            </dl>
          )}
        </Card>

        <Card title="Top matches" action={run && <Button as={Link} to="/capital/matches" variant="link" size="sm">See all matches</Button>}>
          {runLoading ? <Skeleton h="140px" /> : !run ? (
            <p className="ui-muted">Your matches will appear here. <Link to="/capital/find">Find capital</Link></p>
          ) : <ul className="mrows">{run.results.slice(0, 3).map((x) => <MatchRow key={x.record_id} r={x} runId={run.run_id} />)}</ul>}
        </Card>

        <Card title="Pipeline" action={pipeline?.length ? <Button as={Link} to="/capital/pipeline" variant="link" size="sm">Open pipeline</Button> : null}>
          {pipelineGated ? <GateCard compact title="Track your raise in one place." body="Included from Investor-Ready." /> :
            pipelineError ? <LoadError error={pipelineError} onRetry={reloadPipeline} what="your pipeline" /> :
              !pipeline ? <Skeleton h="60px" /> : !active.length ? <p className="ui-muted">Starts when you save a match and move it into your pipeline.</p> : (
                <p className="pipe-line">{ACTIVE.map((s) => ({ s, n: active.filter((p) => p.stage === s).length })).filter((x) => x.n).map((x) => `${stageLabel(x.s)} ${x.n}`).join(' · ')}</p>
              )}
        </Card>

        {expert && (
          <Card title="Experts" action={<Button as={Link} to="/experts/mine" variant="link" size="sm">Open my experts</Button>}>
            <p>{expert.topic || humanise(expert.kind)}</p>
            <p className="ui-muted">{expert.status === 'requested' ? 'Requested · waiting for confirmation' : humanise(expert.status)}</p>
          </Card>
        )}
      </div>

      {recItem && (
        <Card className="home-rec" title="Recommended for you">
          <p><strong>{recItem.name}</strong> · {recItem.price_pending ? 'Price on request' : fmtPrice(recItem.price_usd)}{rec.reason_lines?.[0] ? ` · ${rec.reason_lines[0]}` : ''}</p>
          <Button as={Link} to="/packages" variant="link" size="sm">See packages</Button>
        </Card>
      )}
      <FundraisingNotice />
    </div>
  );
}
