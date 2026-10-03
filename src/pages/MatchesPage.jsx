import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Drawer, EmptyState, Icon, PageHeader, Select, SkeletonCards, Tag, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import MatchCard from '../components/capital/MatchCard';
import MatchTable from '../components/capital/MatchTable';
import CompareDrawer from '../components/capital/CompareDrawer';
import WhyThisFits, { AiConsentCard } from '../components/capital/WhyThisFits';
import useAiConsent from '../lib/useAiConsent';
import { toggleCompare, COMPARE_MAX, sortMatches } from '../lib/matchview';
const sortByEvidence = (rows) => sortMatches(rows, null);
import { GateCard, ProviderBadge, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import {
  getRunNormalised, getLatestRun, runMatch, getUnlocks, listPipeline, addToPipeline, previewMatch,
  completeness, TIERS, BUCKETS, filterLabel, AI_ERROR_TEXT,
} from '../lib/capital';
import { sendFeedback, listFeedback } from '../lib/learning';
import { getRouting, normaliseRoute } from '../lib/routing';
import { fmtUsd, fmtDateTime, fmtInt, countryName, plural } from '../lib/format';
import { logEvent } from '../lib/events';

function inRoutes(r, routes) {
  if (!routes.length) return true;
  if (Array.isArray(r.route_keys) && r.route_keys.length) return routes.some((rt) => r.route_keys.includes(rt.key));
  const types = new Set([r.type, ...(r.investor_types || [])].filter(Boolean).map((t) => t.toLowerCase()));
  return routes.some((rt) => !rt.investor_types.length || rt.investor_types.some((t) => types.has(String(t).toLowerCase())));
}

function ScoreExplainer() {
  return (
    <details className="explainer">
      <summary>What the Match score means</summary>
      <p>How strongly the evidence supports this fit, out of 100. Facts we can't confirm lower it, so a strong fit with gaps in our data can score lower. It is not your chance of raising.</p>
    </details>
  );
}

function ImprovePanel({ unlocks }) {
  if (!unlocks) return null;
  const dom = unlocks.blockers?.dominant_blocker;
  const items = [];
  if (dom) {
    const relax = (unlocks.unlocks || []).find((u) => u.kind === dom.dimension || u.field === dom.dimension) || unlocks.unlocks?.[0];
    items.push(
      <li key="dom" className="improve-lead">
        <strong>{dom.label || filterLabel(dom.dimension)} is behind {dom.share_of_excluded}% of exclusions.</strong>
        {relax && <> {relax.label}: <span className="gl">+{fmtInt(relax.unlocks)} gained{relax.loses ? ` · −${fmtInt(relax.loses)} lost` : ''} · net <b className={relax.net < 0 ? 'neg' : ''}>{relax.net > 0 ? '+' : ''}{fmtInt(relax.net)}</b></span></>}
      </li>,
    );
  } else if (unlocks.unlocks?.[0]) {
    const u = unlocks.unlocks[0];
    items.push(<li key="u0">{u.label}: <span className="gl">+{fmtInt(u.unlocks)} gained{u.loses ? ` · −${fmtInt(u.loses)} lost` : ''} · net <b className={u.net < 0 ? 'neg' : ''}>{u.net > 0 ? '+' : ''}{fmtInt(u.net)}</b></span></li>);
  }
  const res = unlocks.resolvable?.[0];
  if (res) items.push(<li key="res">{res.label} so {fmtInt(res.moves_from_unknown)} investors can be properly checked. Some will fit, some won't.</li>);
  if (!items.length) return null;
  return (
    <Card className="improve-panel" title="Improve your matches" action={<Button as={Link} to="/capital/improve" variant="link" size="sm">See all advice</Button>}>
      <ul className="improve-mini">{items}</ul>
    </Card>
  );
}

function EligibilityPanel({ counts, unlocks, company, onShowExcluded }) {
  const considered = counts?.considered ?? unlocks?.baseline?.considered;
  const eligible = counts?.eligible ?? unlocks?.baseline?.eligible;
  const excluded = counts?.excluded ?? (considered != null && eligible != null ? considered - eligible : null);
  const rows = (unlocks?.blockers?.by_filter || []).slice().sort((a, b) => b.also_involved - a.also_involved).slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => r.also_involved));
  const c = completeness(company);
  return (
    <Card className="elig" title="Eligibility">
      <div className="elig-top">
        <p className="elig-big"><strong>{fmtInt(eligible)}</strong> pass the hard filters, of {fmtInt(considered)} active sources</p>
        <p className="ui-muted">{fmtInt(counts?.high_confidence ?? 0)} high confidence · matching inputs {c.known} of {c.total} known</p>
      </div>
      {rows.length > 0 && (
        <>
          <p className="elig-why">Why the other {fmtInt(excluded)} are excluded (a source can fail more than one filter):</p>
          <ul className="bars">
            {rows.map((r) => (
              <li key={r.dimension}>
                <span className="bars-label">{r.dimension === 'ticket' && company.raise_usd ? `Ticket doesn't fit ${fmtUsd(company.raise_usd)}` : r.label || filterLabel(r.dimension)}</span>
                <span className="bars-track" aria-hidden="true"><i style={{ width: `${(r.also_involved / max) * 100}%` }} /></span>
                <span className="bars-n">{fmtInt(r.also_involved)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Button variant="link" size="sm" onClick={onShowExcluded}>See excluded sources</Button>
    </Card>
  );
}

export default function MatchesPage() {
  const { company, companyId, entitlements, reloadRun, reloadPipeline } = useCompany();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const runId = params.get('run');
  const routeParam = params.get('route') || params.get('routes') || '';
  const routingQ = useApi(() => (routeParam ? getRouting(companyId) : null), [routeParam, companyId]);
  const routes = useMemo(() => {
    const all = (routingQ.data?.routes || []).map(normaliseRoute);
    if (!routeParam) return [];
    if (routeParam === 'fits') return all.filter((r) => r.fit !== 'unlikely');
    const keys = routeParam.split(',');
    return all.filter((r) => keys.includes(r.key));
  }, [routingQ.data, routeParam]);
  const tierParam = params.get('tier');

  const runQ = useApi(() => (runId ? getRunNormalised(runId) : getLatestRun(companyId)), [runId, companyId]);
  const unlocksQ = useApi(() => getUnlocks(companyId), [companyId, runQ.data?.run_id]);
  const pipeQ = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []), [companyId]);
  const fbQ = useApi(() => listFeedback(companyId).then((x) => x.feedback || []).catch(() => []), [companyId]);

  const [filters, setFilters] = useState({ type: '', confidence: '', tier: '', open: false });
  const [showLeads, setShowLeads] = useState(false);
  const [showOutside, setShowOutside] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState({});
  const [excluded, setExcluded] = useState({ open: false, rows: null, error: null });
  const [compare, setCompare] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [aiDeclined, setAiDeclined] = useState(false);
  const consent = useAiConsent(companyId);
  const [compareOpen, setCompareOpen] = useState(false);
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const bucketFilter = params.get('evidence') || '';
  const setParam = (k, v) => setParams((p) => { const q = new URLSearchParams(p); if (v) q.set(k, v); else q.delete(k); return q; }, { replace: true });

  const run = runQ.data;
  const viewedRun = run?.run_id;
  useEffect(() => { if (viewedRun) logEvent('match.viewed', { run_id: viewedRun }, companyId); }, [viewedRun, companyId]);
  const canTrack = pipeQ.error?.status !== 402;
  const canDraft = Number(entitlements?.outreach_drafts_per_month || 0) > 0;
  const pipeByRecord = new Map((pipeQ.data || []).map((p) => [p.record_id, p]));
  const fbByResult = new Map((fbQ.data || []).map((f) => [f.match_result_id, f.rating]));

  async function rerun() {
    setRunning(true);
    try {
      const res = await runMatch(companyId);
      reloadRun();
      setParams((p) => { const q = new URLSearchParams(p); if (res.run_id) q.set('run', res.run_id); return q; });
      toast.success('Matches updated.');
    } catch (e) {
      toast.error(e.status === 503 ? 'Matching is temporarily unavailable. Try again shortly.' : `Couldn't re-run: ${e.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function track(r, stage) {
    setBusy((b) => ({ ...b, [r.record_id]: stage === 'shortlisted' ? 'save' : 'track' }));
    try {
      const { item } = await addToPipeline({ profile_id: companyId, record_id: r.record_id, match_score_at_add: r.match_score, stage, fit_tier_at_add: r.fit_tier, run_id: run?.run_id });
      pipeQ.setData((list) => [...(list || []), item]);
      reloadPipeline();
      toast.success(stage === 'shortlisted' ? `Saved ${r.name}.` : `${r.name} is in your pipeline.`);
    } catch (e) {
      toast.error(e.upgradeRequired ? 'Pipeline tracking is included in Capital Raising.' : `Couldn't save ${r.name}: ${e.message}`);
    } finally {
      setBusy((b) => ({ ...b, [r.record_id]: null }));
    }
  }

  async function feedback(r, rating, reason) {
    if (!r.match_result_id) { toast.error('Feedback needs a saved run. Re-run your matches first.'); return; }
    try {
      await sendFeedback({ company_id: companyId, match_result_id: r.match_result_id, rating, reasons: reason ? [reason] : [] });
      fbQ.setData((list) => [...(list || []).filter((f) => f.match_result_id !== r.match_result_id), { match_result_id: r.match_result_id, rating }]);
      toast.success('Thanks. Your feedback is saved.');
    } catch (e) {
      toast.error(`Couldn't save feedback: ${e.message}`);
    }
  }

  async function showExcluded() {
    setExcluded({ open: true, rows: null, error: null });
    try {
      const founder = { ...company, company_name: company.name, include_non_matches: true };
      const res = await previewMatch(founder);
      setExcluded({ open: true, rows: res.non_matches || [], error: null });
    } catch (e) {
      setExcluded({ open: true, rows: null, error: e.message });
    }
  }

  const header = (
    <PageHeader
      title="Capital matches"
      subtitle={[company.name, company.stage || 'stage unknown', company.sector || 'sector unknown', countryName(company.hq_country_iso2) || 'HQ unknown',
        `${fmtUsd(company.raise_usd) || 'raise unknown'} ${company.instrument || 'instrument unknown'}`].join(' · ')}
      meta={run && (
        <>
          <ProviderBadge provider={run.provider} />
          {run.created_at && <span className="ui-muted">Run {fmtDateTime(run.created_at)}</span>}
          <Button variant="secondary" size="sm" onClick={rerun} loading={running}>Re-run</Button>
        </>
      )}
      actions={!run ? <Button variant="secondary" size="sm" onClick={rerun} loading={running}>Re-run</Button> : null}
    />
  );

  if (runQ.error && runQ.error.status !== 404) {
    return <div><SubNav section="capital" />{header}<LoadError error={runQ.error} onRetry={runQ.reload} what="your matches" /></div>;
  }
  if (!run && runQ.loading) {
    return <div><SubNav section="capital" />{header}<p className="ui-muted">Checking capital sources…</p><SkeletonCards count={5} height={150} /></div>;
  }
  if (!run) {
    return (
      <div><SubNav section="capital" />{header}
        <EmptyState icon="search" title="You haven't run a match yet." body="We check every active capital source against your company and raise."
          action={<Button as={Link} to="/capital/find" variant="accent">Find capital sources</Button>} />
      </div>
    );
  }

  const types = [...new Set(run.results.map((r) => r.type).filter(Boolean))].sort();
  const shown = run.results.filter((r) => inRoutes(r, routes)
    && (!filters.type || r.type === filters.type)
    && (!filters.confidence || String(r.data_confidence).toLowerCase() === filters.confidence)
    && (!filters.tier || r.fit_tier === filters.tier)
    && (!tierParam || r.fit_tier === tierParam)
    && (!filters.open || r.application_open === true));
  const byBucket = Object.fromEntries(BUCKETS.map((b) => [b.key, shown.filter((r) => r.bucket === b.key)]));
  const bucketCount = (k) => run.counts?.[`${k}_bucket`] ?? run.results.filter((r) => r.bucket === k).length;
  const trial = run.results.length > 0 && run.results.every((r) => r.locked);
  const eligible = run.counts?.eligible ?? run.results.length;
  const topMissing = completeness(company).missing[0];
  // I-03: AI explanations on the top 3 cards (D32 covers the top 5 on trial).
  const topIds = new Set(sortByEvidence(shown).slice(0, 3).map((r) => r.record_id));
  const tableRows = shown.filter((r) => (bucketFilter ? r.bucket === bucketFilter : r.bucket !== 'likely_outside'));
  const activeFilters = [
    filters.type && { key: 'type', label: `Type: ${filters.type}`, clear: () => setFilters((f) => ({ ...f, type: '' })) },
    filters.confidence && { key: 'conf', label: `${filters.confidence[0].toUpperCase()}${filters.confidence.slice(1)} confidence`, clear: () => setFilters((f) => ({ ...f, confidence: '' })) },
    filters.tier && { key: 'tier', label: TIERS.find((t) => t.key === filters.tier)?.label, clear: () => setFilters((f) => ({ ...f, tier: '' })) },
    filters.open && { key: 'open', label: 'Open now', clear: () => setFilters((f) => ({ ...f, open: false })) },
  ].filter(Boolean);

  const card = (r) => (
    <MatchCard key={r.record_id} r={r} runId={run.run_id} pipelineItem={pipeByRecord.get(r.record_id)} canTrack={canTrack} canDraft={canDraft}
      busy={busy[r.record_id]} onSave={(x) => track(x, 'shortlisted')} onTrack={(x) => track(x, 'researching')}
      feedback={fbByResult.get(r.match_result_id)} onFeedback={feedback} instrumentUnknown={!company.instrument}
      why={consent.granted && topIds.has(r.record_id) ? <WhyThisFits companyId={companyId} runId={run.run_id} match={r} consent={consent} compact /> : null} />
  );

  return (
    <div className="matches">
      <SubNav section="capital" />
      {header}

      {(run.ai_error || run.ai_error_code) && <Alert tone="warn">{AI_ERROR_TEXT[run.ai_error_code] || AI_ERROR_TEXT.unknown} These are rules-based results.</Alert>}
      {routes.length > 0 && (
        <div className="route-filter">
          <span>Showing {routeParam === 'fits' ? 'every route that fits' : 'route'}:</span>
          {routes.slice(0, routeParam === 'fits' ? 3 : routes.length).map((r) => <Badge key={r.key} tone="brand">{r.label}</Badge>)}
          {routeParam === 'fits' && routes.length > 3 && <span className="ui-muted">and {routes.length - 3} more</span>}
          {routes.length === 1 && routes[0].coverage && (routes[0].coverage.level === 'thin' || (routes[0].coverage.provider_count ?? 99) < 10) && (
            <span className="rcard-thin">Thin coverage: only {plural(routes[0].coverage.provider_count, 'provider')} on record for this route. Treat these as a starting point, not the whole market.</span>
          )}
          <Button variant="link" size="sm" onClick={() => setParams((p) => { const q = new URLSearchParams(p); q.delete('routes'); q.delete('route'); return q; })}>Show every route</Button>
        </div>
      )}

      {/* I-07: investors first. One summary line; the statistics open on demand. */}
      <div className="msummary">
        <p>
          <strong>{fmtInt(eligible)}</strong> open to you
          {run.counts?.excluded != null && <> · {fmtInt(run.counts.excluded)} excluded by a hard filter</>}
          {' · '}
          <button type="button" className="msummary-toggle" aria-expanded={showStats} aria-controls="mstats" onClick={() => setShowStats((v) => !v)}>
            {showStats ? 'Hide why' : 'Why, and how to open more'}<Icon name="chevronDown" />
          </button>
        </p>
      </div>
      {showStats && (
        <div className="matches-top" id="mstats">
          {unlocksQ.data ? <ImprovePanel unlocks={unlocksQ.data} /> : null}
          <EligibilityPanel counts={run.counts} unlocks={unlocksQ.data} company={company} onShowExcluded={showExcluded} />
        </div>
      )}

      {eligible === 0 ? (
        <EmptyState icon="search" title="No source in our database fits every hard filter for this profile."
          body={(unlocksQ.data?.blockers?.by_filter || []).slice(0, 3).map((b) => `${fmtInt(b.also_involved)} excluded on ${String(b.label || b.dimension).toLowerCase()}`).join(' · ')}
          action={<Button as={Link} to="/capital/improve" variant="primary">See what would change this</Button>} />
      ) : (
        <>
          <div className="mtoolbar">
            <div className="mchips" role="group" aria-label="Evidence tier">
              {[{ key: '', label: 'All tiers', n: bucketCount('eligible') + bucketCount('possible') + bucketCount('likely_outside') }, ...BUCKETS.map((b) => ({ key: b.key, label: b.key === 'possible' ? 'Possible' : b.key === 'likely_outside' ? 'Likely outside mandate' : b.label, n: bucketCount(b.key) }))].map((c) => (
                <button key={c.key || 'all'} type="button" className={`mchip mchip-${c.key || 'all'}${bucketFilter === c.key ? ' is-on' : ''}`} aria-pressed={bucketFilter === c.key} onClick={() => setParam('evidence', c.key)}>
                  {c.key && <span className="mchip-dot" aria-hidden="true" />}{c.label}<span className="mchip-n">{fmtInt(c.n)}</span>
                </button>
              ))}
            </div>
            <div className="mtool-right">
            <button type="button" className={`mfilter-btn${showFilters ? ' is-on' : ''}${activeFilters.length ? ' has-active' : ''}`} aria-expanded={showFilters} aria-controls="mfilters" onClick={() => setShowFilters((v) => !v)}>
              <Icon name="settings" />Filters{activeFilters.length ? ` (${activeFilters.length})` : ''}
            </button>
            <div className="mview" role="group" aria-label="Layout">
              <button type="button" aria-pressed={view === 'cards'} className={view === 'cards' ? 'is-on' : ''} onClick={() => setParam('view', '')}><Icon name="layers" />Cards</button>
              <button type="button" aria-pressed={view === 'table'} className={view === 'table' ? 'is-on' : ''} onClick={() => setParam('view', 'table')}><Icon name="menu" />Table</button>
            </div>
            </div>
          </div>
          <div className={`mfilters${showFilters ? ' is-open' : ''}`} id="mfilters" role="group" aria-label="Filter matches">
            <Select aria-label="Type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="All types" options={types} />
            <Select aria-label="Confidence" value={filters.confidence} onChange={(e) => setFilters({ ...filters, confidence: e.target.value })} placeholder="Any confidence"
              options={[{ value: 'high', label: 'High confidence' }, { value: 'medium', label: 'Medium confidence' }, { value: 'low', label: 'Low confidence' }]} />
            <Select aria-label="Tier" value={filters.tier} onChange={(e) => setFilters({ ...filters, tier: e.target.value })} placeholder="All fit levels" options={TIERS.map((t) => ({ value: t.key, label: t.label }))} />
            <label className="check"><input type="checkbox" checked={filters.open} onChange={(e) => setFilters({ ...filters, open: e.target.checked })} /> Open now</label>
          </div>
          {activeFilters.length > 0 && (
            <div className="mactive" aria-label="Active filters">
              {activeFilters.map((f) => <Tag key={f.key} onRemove={f.clear}>{f.label}</Tag>)}
              <Button variant="link" size="sm" onClick={() => setFilters({ type: '', confidence: '', tier: '', open: false })}>Clear all</Button>
              <span className="ui-muted">{fmtInt(shown.length)} of {fmtInt(run.results.length)} shown</span>
            </div>
          )}

          {view === 'cards' && !consent.loading && !consent.granted && !aiDeclined && (
            <AiConsentCard consent={consent} compact onDecline={() => setAiDeclined(true)} />
          )}
          <p className="tier-order">Grouped by evidence: verified fits first, then possible, then likely outside. A higher score in a later group rests on facts we can't confirm yet.</p>
          <ScoreExplainer />
          <p className="bucket-summary">
            <strong>{fmtInt(bucketCount('eligible'))} verified {bucketCount('eligible') === 1 ? 'fit' : 'fits'}</strong>
            {' · '}{fmtInt(bucketCount('possible'))} possible{bucketCount('possible') > 0 ? ': our data on these investors is still being verified' : ''}
            {bucketCount('likely_outside') > 0 ? ` · ${fmtInt(bucketCount('likely_outside'))} likely outside their mandate` : ''}
          </p>
          {view === 'table' ? (
            <>
              <p className="ui-muted mt-note">Sorting applies inside each evidence tier, so a possible match never sits above a verified one. Hover or focus a fit mark to see its evidence.{!bucketFilter && byBucket.likely_outside.length > 0 ? ' Likely-outside results are hidden; pick that tier above to see them.' : ''}</p>
              {tableRows.length ? <MatchTable rows={tableRows} runId={run.run_id} selected={compare} onToggle={(id) => setCompare((c) => toggleCompare(c, id))} />
                : <EmptyState icon="search" title="No matches with these filters." body="Your filters hide every result in this tier." action={<Button variant="secondary" onClick={() => { setFilters({ type: '', confidence: '', tier: '', open: false }); setParam('evidence', ''); }}>Clear filters</Button>} />}
            </>
          ) : (
          <>
          {(!bucketFilter || bucketFilter === 'eligible') && <section className="tier" aria-labelledby="b-eligible">
            <h2 id="b-eligible" className="tier-h tier-h-strong">Verified eligible <span>({byBucket.eligible.length}{bucketCount('eligible') > byBucket.eligible.length ? ` shown of ${fmtInt(bucketCount('eligible'))}` : ''})</span></h2>
            <p className="ui-muted">Every decisive fit (stage, sector, geography, ticket) rests on researched evidence.</p>
            {byBucket.eligible.length ? byBucket.eligible.map(card) : (
              bucketCount('eligible') > 0 ? (
                <p className="tier-empty">{fmtInt(bucketCount('eligible'))} verified {bucketCount('eligible') === 1 ? 'fit is' : 'fits are'} outside the top {run.results.length} your plan shows. <Link to="/packages?highlight=capital-raising">See every match with Capital Raising</Link>.</p>
              ) : (
                <p className="tier-empty">No verified fits yet. That reflects how much of these investors' mandates we have verified, not your company.{topMissing ? ` Adding ${topMissing.label.toLowerCase()} would also sharpen your results.` : ''}</p>
              )
            )}
          </section>}
          {(!bucketFilter || bucketFilter === 'possible') && <section className="tier" aria-labelledby="b-possible">
            <h2 id="b-possible" className="tier-h">Possible: insufficient evidence <span>({byBucket.possible.length}{bucketCount('possible') > byBucket.possible.length ? ` shown of ${fmtInt(bucketCount('possible'))}` : ''})</span></h2>
            <p className="ui-muted">Nothing on record rules them out, but at least one decisive fact is unknown. Unknown never counts as a fit, and it lowers the score.</p>
            {byBucket.possible.length > 12 && !showLeads ? (
              <>
                {byBucket.possible.slice(0, 12).map(card)}
                <Button variant="secondary" size="sm" onClick={() => setShowLeads(true)}>Show all {fmtInt(byBucket.possible.length)} possible</Button>
              </>
            ) : byBucket.possible.map(card)}
          </section>}
          {(!bucketFilter || bucketFilter === 'likely_outside') && <section className="tier tier-outside" aria-labelledby="b-outside">
            <h2 id="b-outside" className="tier-h">
              <button type="button" className="tier-toggle" aria-expanded={showOutside} onClick={() => setShowOutside((v) => !v)}>
                Likely outside their mandate <span>({byBucket.likely_outside.length}{bucketCount('likely_outside') > byBucket.likely_outside.length ? ` shown of ${fmtInt(bucketCount('likely_outside'))}` : ''})</span> <span aria-hidden="true">{showOutside ? '▾' : '▸'}</span>
              </button>
            </h2>
            <p className="ui-muted">Their own published criteria suggest they don't back companies like yours. This isn't verified, so we show the reason rather than hide them.</p>
            {(showOutside || bucketFilter === 'likely_outside') && byBucket.likely_outside.map(card)}
          </section>}
          </>
          )}
        </>
      )}

      {compare.length > 0 && (
        <div className="mcompare-bar" role="region" aria-label="Compare">
          <span><strong>{compare.length}</strong> of {COMPARE_MAX} selected to compare</span>
          <Button variant="ghost" size="sm" onClick={() => setCompare([])}>Clear</Button>
          <Button variant="primary" size="sm" disabled={compare.length < 2} onClick={() => setCompareOpen(true)}>Compare {compare.length >= 2 ? compare.length : ''}</Button>
        </div>
      )}
      <CompareDrawer open={compareOpen} onClose={() => setCompareOpen(false)} runId={run.run_id}
        companyId={companyId}
        // The engine's order, never the order of selection (match_compare keeps it too).
        rows={run.results.filter((r) => compare.includes(r.record_id))}
        onRemove={(id) => setCompare((c) => { const next = c.filter((x) => x !== id); if (next.length < 2) setCompareOpen(false); return next; })} />

      {trial && (
        <GateCard title={`You're seeing your top ${run.results.length} of ${fmtInt(eligible)}`}
          body="See all matches, how to reach each one, and track them in a pipeline. Included in Capital Raising." />
      )}

      <Drawer open={excluded.open} onClose={() => setExcluded({ open: false, rows: null, error: null })} title="Excluded sources" description="Sources that fail at least one hard filter for your profile, with the reason.">
        {excluded.error && <Alert tone="bad">Couldn't load excluded sources. {excluded.error}</Alert>}
        {!excluded.rows && !excluded.error && <SkeletonCards count={4} height={56} />}
        {excluded.rows && (
          <ul className="excluded">
            {excluded.rows.slice(0, 100).map((x) => (
              <li key={x.record_id || x.name}>
                <strong>{x.name}</strong> <span className="ui-muted">{[x.type, x.country].filter(Boolean).join(', ')}</span>
                <ul>{(x.why_not || []).map((w, i) => <li key={i}>{w}</li>)}</ul>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <p className="ui-faint">Missing something? <Button variant="link" size="sm" onClick={() => navigate('/capital/improve')}>See what would open more investors</Button></p>
    </div>
  );
}
