import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Badge, Button, Card, ConfidenceBadge, EmptyState, FitList, FitRow, FormField, Input, Modal, Select, Skeleton, Tag, Textarea, useToast,
} from '../design/ui';
import { useCompany } from '../components/company-context';
import MatchScore from '../components/capital/MatchScore';
import WhyThisFits from '../components/capital/WhyThisFits';
import { MeetingPrep } from '../components/capital/AiBlocks';
import useAiConsent from '../lib/useAiConsent';
import { FundraisingNotice, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import {
  getSource, getRunNormalised, listPipeline, addToPipeline, previewMatch, FIT_DIMENSIONS, confidenceLevel, stageLabel, fitReasonText, bucketHeadline, tierWithinBucket, investorHref, ticketRange,
} from '../lib/capital';
import { submitCorrection, recordNotFit, CORRECTION_FIELDS, FEEDBACK_DOWN_REASONS } from '../lib/learning';
import { recordOutcome, kindForRoute } from '../lib/fundraising';
import { fmtUsd, fmtDate, stealthLabel, countryName, wordsForCodes } from '../lib/format';
import { MATCH_SCORE_EXPLAINER } from '../lib/matchview';
import { gateFor } from '../lib/plan';

// D16 provenance labels. Derived from the record's own evidence until the
// data module publishes per-field labels (it then wins: profile.field_provenance).
const PROV = {
  provider: 'Capital Provider Verified', conncct: 'Research Verified', licensed: 'Licensed Data Provider',
  public: 'Public Source', ai: 'AI Inferred', unknown: 'Unknown',
};
function provenance(profile, field, value) {
  const server = profile.field_provenance?.[field];
  if (server && typeof server === 'object') return stealthLabel(server.label_text) || PROV[server.label] || server.label || PROV.unknown;
  if (server) return PROV[server] || server;
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length) || value === 'Unknown';
  if (empty) return PROV.unknown;
  if ((profile.evidence?.derived_fields || []).includes(field)) return PROV.ai;
  if (profile.evidence?.verification_level === 'Primary') return PROV.conncct;
  return PROV.public;
}
const provTone = (l) => (l === PROV.unknown ? 'outline' : l === PROV.ai ? 'warn' : l === PROV.conncct ? 'brand' : l === PROV.provider ? 'ok' : 'neutral');

function Prov({ profile, field, value }) {
  const l = provenance(profile, field, value);
  const fp = profile.field_provenance?.[field];
  const tip = fp && typeof fp === 'object' ? [stealthLabel(fp.label_text), stealthLabel(fp.basis), fp.source_name, fp.as_of && `as of ${fp.as_of}`].filter(Boolean).join(' · ') : l;
  // R-CI-F2: the date is visible text, not only a hover title (touch users can't hover).
  const asOf = fp && typeof fp === 'object' && fp.as_of && l !== PROV.unknown ? fmtDate(fp.as_of) : null;
  return <Badge tone={provTone(l)} size="sm" className="prov" title={tip}>{l}{asOf ? ` · ${asOf}` : ''}</Badge>;
}

const list = (a) => (Array.isArray(a) && a.length ? a.join(', ') : null);
const NOT_ON_RECORD = 'Not on record';

function fitDetail(dim, m, company, result) {
  const reason = fitReasonText(result, dim);
  if (reason) return wordsForCodes(reason);
  const missingOwn = (result?.missing_from_your_profile || []);
  const state = result?.fits?.[dim];
  if (state === 'unknown') {
    const own = { stage: 'your stage', ticket: 'how much you are raising', geography: 'where you are headquartered', sector: 'your sector' }[dim];
    if (own && missingOwn.includes(own)) {
      return dim === 'ticket' ? "You haven't set your raise amount." : 'Not set in your company profile.';
    }
    return 'Not on record for this investor.';
  }
  switch (dim) {
    case 'stage': return `Backs ${list(m.stages) || 'stages not on record'}; you're ${company.stage || 'stage unknown'}.`;
    case 'sector': return `${list(m.sectors) || 'Sectors not on record'}; you're ${company.sector || 'sector unknown'}.`;
    case 'geography': return `Accepts companies from ${list((m.accepts_hq || []).map(countryName)) || 'markets not on record'}; you're in ${countryName(company.hq_country_iso2) || 'a country not set'}.`;
    case 'ticket': return `Writes ${m.ticket?.label || 'cheques of unknown size'}; you're raising ${fmtUsd(company.raise_usd) || 'an amount not set'}.`;
    case 'business_model': return `${list(m.business_models) || 'Business models not on record'}; you're ${company.business_model || 'model unknown'}.`;
    default: return null;
  }
}

const SECTIONS = [
  ['overview', 'Overview'], ['fit', 'Why you match'], ['mismatch', 'Potential mismatches'], ['mandate', 'Mandate'],
  ['portfolio', 'Portfolio'], ['contact', 'How to reach them'], ['activity', 'Activity'], ['sources', 'Sources'], ['similar', 'Similar'],
];

const COVERAGE_ORDER = [PROV.provider, PROV.conncct, PROV.licensed, PROV.public, PROV.ai, PROV.unknown];
const COVERAGE_CLS = { [PROV.provider]: 'provider', [PROV.conncct]: 'research', [PROV.licensed]: 'licensed', [PROV.public]: 'public', [PROV.ai]: 'ai', [PROV.unknown]: 'unknown' };

/** Evidence coverage of the mandate: how many fields carry which D16 label. Counts only what the page shows. */
function Coverage({ profile, rows }) {
  const labels = rows.map(([, field, raw]) => provenance(profile, field, raw));
  const counts = COVERAGE_ORDER.map((l) => [l, labels.filter((x) => x === l).length]).filter(([, n]) => n > 0);
  const known = labels.filter((l) => l !== PROV.unknown).length;
  return (
    <div className="inv-cov">
      <p className="inv-cov-h"><strong>{known} of {labels.length}</strong> mandate fields on record</p>
      <div className="inv-cov-bar" role="img" aria-label={counts.map(([l, n]) => `${n} ${l}`).join(', ')}>
        {counts.map(([l, n]) => <i key={l} className={`cov-${COVERAGE_CLS[l]}`} style={{ flexGrow: n }} title={`${n} ${l}`} />)}
      </div>
      <ul className="inv-cov-legend">
        {counts.map(([l, n]) => <li key={l}><span className={`cov-dot cov-${COVERAGE_CLS[l]}`} aria-hidden="true" />{l} <b>{n}</b></li>)}
      </ul>
    </div>
  );
}

/** Highlights the section in view in the on-page nav. */
function useActiveSection(ids, ready) {
  const [active, setActive] = useState(ids[0]);
  const [pinnedUntil, setPinnedUntil] = useState(0);
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return undefined;
    const els = ids.map((i) => document.getElementById(i)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis && Date.now() > pinnedUntil) setActive(vis.target.id);
    }, { rootMargin: '-80px 0px -60% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids, ready, pinnedUntil]);
  // A click on the nav wins over the observer while the page scrolls there
  // (the last sections can't reach the top of the viewport).
  const pick = (id) => { setPinnedUntil(Date.now() + 1200); setActive(id); };
  return [active, pick];
}
const SECTION_IDS = SECTIONS.map(([k]) => k);

function ProfileSkeleton() {
  return (
    <div className="inv" aria-busy="true" aria-label="Loading investor">
      <Skeleton w="120px" h="14px" />
      <div className="inv-skel-head"><div className="ui-stack"><Skeleton w="45%" h="30px" /><Skeleton w="30%" h="14px" /><Skeleton w="60%" h="36px" /></div><Skeleton w="96px" h="96px" r="16px" /></div>
      <div className="inv-grid"><Skeleton h="260px" r="12px" /><Skeleton h="260px" r="12px" /><Skeleton h="320px" r="12px" /><Skeleton h="320px" r="12px" /></div>
    </div>
  );
}

export default function InvestorProfilePage() {
  const { recordId } = useParams();
  const [params] = useSearchParams();
  const { company, companyId, run: latestRun, entitlements, reloadPipeline } = useCompany();
  const toast = useToast();
  const runId = params.get('run');

  const srcQ = useApi(() => getSource(recordId, companyId), [recordId, companyId]);
  const runQ = useApi(() => (runId ? getRunNormalised(runId) : Promise.resolve(latestRun)), [runId, latestRun?.run_id]);
  const pipeQ = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []), [companyId]);
  const result = runQ.data?.results?.find((r) => r.record_id === recordId) || null;
  const notInRun = runQ.data !== undefined && !runQ.loading && !result;
  const ineligQ = useApi(() => (notInRun ? previewMatch({ ...company, company_name: company.name, include_non_matches: true }) : null), [notInRun, recordId]);

  const [busy, setBusy] = useState(null);
  const [dialog, setDialog] = useState(null); // 'correction' | 'dismiss' | 'brief'
  const [corr, setCorr] = useState({ field: 'stages', proposed_value: '', evidence_url: '', note: '' });
  const [dismissReason, setDismissReason] = useState('wrong_geography');
  const consent = useAiConsent(companyId);
  const [activeSection, pickSection] = useActiveSection(SECTION_IDS, Boolean(srcQ.data?.profile));

  if (srcQ.error) {
    if (srcQ.error.status === 404) {
      return <EmptyState icon="search" title="We couldn't find this capital source. It may have been retired." action={<Button as={Link} to="/capital/matches" variant="primary">Back to matches</Button>} />;
    }
    return <LoadError error={srcQ.error} onRetry={srcQ.reload} what="this investor" />;
  }
  const p = srcQ.data?.profile;
  if (!p) return <ProfileSkeleton />;

  const m = p.mandate || {};
  const app = p.application || {};
  const ev = p.evidence || {};
  const fr = p.freshness || {};
  const id = p.identity || {};
  const pipelineItem = (pipeQ.data || []).find((x) => x.record_id === recordId);
  const canTrack = pipeQ.error?.status !== 402;
  const canDraft = Number(entitlements?.outreach_drafts_per_month || 0) > 0;
  const kind = kindForRoute(app.route);
  const locked = Boolean(p.locked);
  const nonMatch = ineligQ.data?.non_matches?.find((x) => x.record_id === recordId);

  async function track(stage) {
    setBusy(stage);
    try {
      const { item } = await addToPipeline({ profile_id: companyId, record_id: recordId, match_score_at_add: result?.match_score ?? null, stage, fit_tier_at_add: result?.fit_tier, run_id: runQ.data?.run_id });
      pipeQ.setData((l) => [...(l || []), item]);
      reloadPipeline();
      toast.success(stage === 'shortlisted' ? `Saved ${id.name}.` : `${id.name} is in your pipeline.`);
    } catch (e) {
      toast.error(e.upgradeRequired ? (e.code === 'fair_use_limit' ? gateFor(e).message : 'Pipeline tracking is included in Capital Raising.') : `Couldn't save: ${e.message}`);
    } finally { setBusy(null); }
  }

  async function sendCorrection() {
    setBusy('corr');
    try {
      await submitCorrection({ company_id: companyId, record_id: recordId, ...corr });
      toast.success('Thanks. Our research team checks every suggestion before anything changes.');
      setDialog(null);
      setCorr({ field: 'stages', proposed_value: '', evidence_url: '', note: '' });
    } catch (e) {
      toast.error(`Couldn't submit: ${e.message}`);
    } finally { setBusy(null); }
  }

  async function dismiss() {
    setBusy('dismiss');
    try {
      try {
        await recordOutcome(companyId, { record_id: recordId, outcome: 'not_fit', reason_code: dismissReason });
      } catch (e) {
        if (e.status !== 404) throw e;
        await recordNotFit({ company_id: companyId, record_id: recordId, reason: dismissReason });
      }
      toast.success(`Noted. ${id.name} won't be suggested as a fit for you.`);
      setDialog(null);
    } catch (e) {
      toast.error(`Couldn't record that: ${e.message}`);
    } finally { setBusy(null); }
  }

  const mandateRows = [
    ['Stage', 'stages', m.stages, list(m.stages)],
    ['Sector', 'sectors', m.sectors, list(m.sectors)],
    ['Sector exclusions', 'sector_exclusions', m.sector_exclusions, list(m.sector_exclusions)],
    ['Geography (accepts HQ)', 'accepts_hq', m.accepts_hq, list((m.accepts_hq || []).map(countryName))],
    ['Target markets', 'target_markets', m.target_markets, list((m.target_markets || []).map(countryName))],
    ['Ticket', 'ticket_min_usd', m.ticket?.label, m.ticket?.label],
    ['Investment type', 'instruments', m.instruments, list(m.instruments)],
    ['Investor types', 'investor_types', m.investor_types, list(m.investor_types)],
    ['Business models', 'business_models', m.business_models, list(m.business_models)],
    ['Lead preference', 'lead_preference', m.lead_preference, m.lead_preference !== 'Unknown' ? m.lead_preference : null],
    ['Equity taken', 'equity_taken_pct', m.equity_taken_pct, m.equity_taken_pct != null ? `${m.equity_taken_pct}%` : null],
    ['Revenue requirement', 'revenue_requirement', m.revenue_requirement, m.revenue_requirement !== 'Unknown' ? m.revenue_requirement : null],
    ['Local presence', 'requires_local_presence', m.requires_local_presence, m.requires_local_presence == null ? null : m.requires_local_presence ? 'Required' : 'Not required'],
    ['Thesis', 'thesis_keywords', m.thesis_keywords, list(m.thesis_keywords)],
  ];
  const runIds = new Set((runQ.data?.results || []).map((r) => r.record_id));
  const fitItems = FIT_DIMENSIONS.map((d) => ({ key: d.key, label: d.key === 'business_model' ? 'Business model' : d.label, state: result?.fits?.[d.key], detail: fitDetail(d.key, m, company, result) }));
  const mismatches = fitItems.filter((f) => f.state === 'no' || f.state === 'partial');

  return (
    <div className="inv">
      <Link to={`/capital/matches${runId ? `?run=${runId}` : ''}`} className="back">← Back to matches</Link>

      <Card className="inv-head" id="overview">
        <div className="inv-head-main">
          <h1>{id.name}</h1>
          <p className="inv-sub">{[id.type, [id.city, id.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
          <p className="ui-muted">{fr.label || 'No dated evidence of activity'}</p>
          <Coverage profile={p} rows={mandateRows} />
          <div className="inv-actions">
            {pipelineItem ? (
              pipelineItem.stage === 'shortlisted'
                ? <Button as={Link} to="/capital/saved" variant="secondary" iconLeft="check">Saved</Button>
                : <Button as={Link} to="/capital/pipeline" variant="secondary" iconLeft="check">In pipeline · {stageLabel(pipelineItem.stage)}</Button>
            ) : canTrack ? (
              <>
                <Button variant="primary" onClick={() => track('shortlisted')} loading={busy === 'shortlisted'}>Save</Button>
                <Button variant="secondary" onClick={() => track('researching')} loading={busy === 'researching'}>Add to pipeline</Button>
              </>
            ) : <Button as={Link} to="/packages?highlight=capital-raising" variant="secondary" iconLeft="lock">Save</Button>}
            {kind === null ? null : canDraft && !locked
              ? <Button as={Link} to={`/capital/outreach?record=${encodeURIComponent(recordId)}&kind=${kind}`} variant="secondary">Prepare outreach</Button>
              : <Button as={Link} to="/packages?highlight=capital-raising" variant="ghost" iconLeft="lock">Prepare outreach</Button>}
            <Button variant="ghost" iconLeft="spark" onClick={() => setDialog('brief')}>Prepare for the call</Button>
            <Button variant="ghost" onClick={() => setDialog('dismiss')}>Not for us</Button>
          </div>
        </div>
        <div className="inv-score">
          {result ? (
            <>
              <MatchScore score={result.match_score} confidence={result.data_confidence} size="lg" />
              <span className={`inv-bucket inv-bucket-${result.bucket}`}>{bucketHeadline(result)}</span>
              <span className="tier">{tierWithinBucket(result)}</span>
            </>
          ) : notInRun ? <Badge tone="neutral">Not in your latest run</Badge> : <Skeleton w="96px" h="96px" />}
        </div>
      </Card>

      <nav className="inv-toc" aria-label="On this page">
        {SECTIONS.filter(([k]) => k !== 'similar' || (p.similar || []).length).map(([k, l]) => <a key={k} href={`#${k}`} onClick={() => pickSection(k)} className={activeSection === k ? 'is-active' : undefined} aria-current={activeSection === k ? 'location' : undefined}>{l}</a>)}
      </nav>

      {notInRun && (
        <Alert tone="warn" title="Not eligible for your profile">
          {ineligQ.loading && !ineligQ.data ? 'Checking why…' : nonMatch?.why_not?.length ? (
            <ul className="plain-list">{nonMatch.why_not.map((w, i) => <li key={i}>{w}</li>)}</ul>
          ) : 'This source is outside your current matches. No Match score is shown.'}
        </Alert>
      )}

      <div className="inv-grid">
        <Card id="fit" title={`How it fits ${company.name}`} className="inv-fit">
          {result ? (
            <>
              <FitList label="Fit by dimension">
                {fitItems.map((f) => <FitRow key={f.key} state={f.state} label={f.label} detail={f.detail} />)}
              </FitList>
              {result.missing_from_your_profile?.length > 0 && (
                <p className="ui-muted">
                  Missing on your side: {result.missing_from_your_profile.join(', ')}.{' '}
                  {result.missing_from_your_profile.some((x) => /raising|instrument/.test(x))
                    ? <Link to="/capital/need">Set in Capital need</Link>
                    : <Link to="/company/business">Edit company details</Link>}
                </p>
              )}
              <WhyThisFits companyId={companyId} runId={runQ.data?.run_id} match={result} consent={consent} />
              {result.why_matched && <div className="mcard-why"><span className="mcard-why-label">Why you match</span><p>{wordsForCodes(result.why_matched)}</p></div>}
              {result.ai_reasoning && <p className="mcard-ai"><Badge tone="gold" size="sm">AI-refined</Badge> {result.ai_reasoning}</p>}
              <details className="explainer"><summary>What the Match score means</summary><p>{MATCH_SCORE_EXPLAINER}</p></details>
            </>
          ) : <p className="ui-muted">No Match score: this source isn't in your current matches.</p>}
        </Card>

        <Card id="mismatch" title="Potential mismatches and what we don't know">
          {mismatches.length > 0 && (
            <ul className="plain-list">{mismatches.map((f) => <li key={f.key}><strong>{f.label}:</strong> {f.detail}</li>)}</ul>
          )}
          {(p.what_we_dont_know || []).length > 0 ? (
            <ul className="plain-list unknown-list">{p.what_we_dont_know.map((u) => <li key={u.field}>{u.label}: not on record</li>)}</ul>
          ) : <p className="ui-muted">The main mandate fields are on record.</p>}
          {(result?.caveats?.length ? result.caveats : p.caveats || []).map((c, i) => (
            <Alert key={i} tone="warn">{wordsForCodes(typeof c === 'string' ? c : c.message || c.text)}{' '}{c?.detail || 'Check before applying.'}</Alert>
          ))}
          <p className="ui-muted">Something wrong here? <Button variant="link" size="sm" onClick={() => setDialog('correction')}>Suggest a correction</Button></p>
        </Card>

        <Card id="mandate" title="Mandate">
          <dl className="facts facts-prov">
            {mandateRows.map(([label, field, raw, shown]) => (
              <div key={field}><dt>{label}</dt><dd>{shown || <span className="ui-faint">{NOT_ON_RECORD}</span>} <Prov profile={p} field={field} value={raw} /></dd></div>
            ))}
          </dl>
        </Card>

        <Card id="portfolio" title="Portfolio">
          {(p.portfolio?.examples || []).length ? <div className="ui-tags">{p.portfolio.examples.map((x) => <Tag key={x}>{x}</Tag>)}</div> : <p className="ui-faint">{NOT_ON_RECORD}</p>}
          {p.portfolio?.notable_alumni && <p className="ui-muted">{p.portfolio.notable_alumni}</p>}
          {p.team?.length > 0 && (
            <>
              <h4 className="sub-h">Relevant team</h4>
              <ul className="plain-list">{p.team.map((t, i) => <li key={i}>{t.name}{t.role ? `, ${t.role}` : ''}</li>)}</ul>
            </>
          )}
        </Card>

        <Card id="contact" title="Application and contact route">
          {locked ? (
            <div className="locked-route">
              <p><Badge tone="outline">Locked</Badge> How to reach them is included in Capital Raising.</p>
              <Button as={Link} to="/packages?highlight=capital-raising" variant="secondary" size="sm">See packages</Button>
            </div>
          ) : (
            <>
              <dl className="facts">
                <div><dt>Route</dt><dd>{app.route && app.route !== 'Unknown' ? <>{app.route} <Prov profile={p} field="contact_route" value={app.route} /></> : NOT_ON_RECORD}</dd></div>
                <div><dt>Applications</dt><dd>{app.status === 'open' ? 'Open' : app.status === 'closed' ? 'Closed' : 'Not on record'}</dd></div>
                {app.deadline && <div><dt>Deadline</dt><dd>{fmtDate(app.deadline)}</dd></div>}
                {app.next_intake && <div><dt>Next intake</dt><dd>{app.next_intake}</dd></div>}
              </dl>
              {app.route === 'Invitation only' && <p className="ui-muted">This investor only reviews invited companies. Track them in your pipeline and watch for an opening.</p>}
              {app.route === 'Warm intro only' && <p className="ui-muted">This investor only takes introductions. Draft a note to someone who knows them.</p>}
              {app.guidance && <p className="ui-muted">{app.guidance}</p>}
              <div className="ui-row">
                {app.website && <Button as="a" href={app.website} target="_blank" rel="noreferrer" variant="secondary" size="sm">Website ↗</Button>}
                {app.application_url && <Button as="a" href={app.application_url} target="_blank" rel="noreferrer" variant="secondary" size="sm">Application ↗</Button>}
              </div>
            </>
          )}
        </Card>

        <Card id="activity" title="Recent activity and verification">
          <dl className="facts">
            <div><dt>Last activity</dt><dd>{fr.last_activity_date ? fmtDate(fr.last_activity_date) : 'No dated evidence of activity'}</dd></div>
            <div><dt>Verification</dt><dd>{ev.verification_level && ev.verification_level !== 'None' ? ev.verification_level : 'Not verified'}{fr.verified_date ? ` · ${fmtDate(fr.verified_date)}` : ''}</dd></div>
            <div><dt>Data confidence</dt><dd><ConfidenceBadge level={confidenceLevel(p.confidence?.band)} size="sm" /> {p.confidence?.unknown_count ? `${p.confidence.unknown_count} key fields not on record` : ''}</dd></div>
          </dl>
          {fr.note && <p className="ui-muted">{fr.note}</p>}
        </Card>

        <Card id="sources" title="Sources">
          <p className="ui-muted">Each fact above carries where it comes from: Capital Provider Verified, Research Verified, Licensed Data Provider, Public Source, AI Inferred or Unknown. Inferred values are never shown as verified.</p>
          {ev.derived_note && <p className="ui-muted">{ev.derived_note}</p>}
          {locked ? <p className="ui-faint">Source links are included in Capital Raising.</p> : (ev.urls || []).length ? (
            <ul className="plain-list src-list">{ev.urls.map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{u.replace(/^https?:\/\//, '').slice(0, 70)}</a></li>)}</ul>
          ) : <p className="ui-faint">No source links on record.</p>}
        </Card>
      </div>

      {(p.similar || []).length > 0 && (
        <Card id="similar" title="Similar capital providers" className="inv-similar"
          action={<span className="ui-muted inv-similar-note">Compared on mandate overlap. Similar is not a match for you.</span>}>
          <ul className="sim-list">
            {p.similar.map((x) => (
              <li key={x.record_id}>
                <Link to={investorHref(x.record_id, runIds.has(x.record_id) ? runQ.data?.run_id : null)} className="sim-card">
                  <span className="sim-top"><span className="sim-name">{x.name}</span><span className="sim-pct" title="Mandate overlap with this provider">{x.similarity}% overlap</span></span>
                  <span className="sim-meta">{[x.type, countryName(x.country)].filter(Boolean).join(' · ') || 'Type and country not on record'}{' · '}{ticketRange(x.ticket_min_usd, x.ticket_max_usd) || 'ticket not on record'}</span>
                  <span className="sim-why">{wordsForCodes(x.why_similar)}</span>
                  {runIds.has(x.record_id) && <Badge tone="info" size="sm">In your matches</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <FundraisingNotice />

      <Modal open={dialog === 'correction'} onClose={() => setDialog(null)} title="Suggest a correction"
        description="Tell us what's wrong and where you saw it. Our research team checks every suggestion before anything changes."
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" onClick={sendCorrection} loading={busy === 'corr'} disabled={!corr.proposed_value && !corr.note}>Submit correction</Button></>}>
        <div className="ui-form">
          <FormField label="What's wrong?"><Select value={corr.field} onChange={(e) => setCorr({ ...corr, field: e.target.value })} options={CORRECTION_FIELDS.map((f) => ({ value: f.key, label: f.label }))} /></FormField>
          <FormField label="Correct value"><Input value={corr.proposed_value} onChange={(e) => setCorr({ ...corr, proposed_value: e.target.value })} /></FormField>
          <FormField label="Where you saw it" optional hint="A link to their site or an announcement."><Input value={corr.evidence_url} onChange={(e) => setCorr({ ...corr, evidence_url: e.target.value })} placeholder="https://" /></FormField>
          <FormField label="Note" optional wide><Textarea rows={3} value={corr.note} onChange={(e) => setCorr({ ...corr, note: e.target.value })} /></FormField>
        </div>
      </Modal>

      <Modal open={dialog === 'dismiss'} onClose={() => setDialog(null)} size="sm" title={`Not for ${company.name}?`} description="Tell us why. It improves your future matches."
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" onClick={dismiss} loading={busy === 'dismiss'}>Mark as not for us</Button></>}>
        <Select aria-label="Reason" value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} options={FEEDBACK_DOWN_REASONS.map((x) => ({ value: x.key, label: x.label }))} />
      </Modal>

      <Modal open={dialog === 'brief'} onClose={() => setDialog(null)} size="lg" title={`Prepare for the call: ${id.name}`} description="Built only from this investor's record and your profile. Nothing here is sent.">
        <MeetingPrep companyId={companyId} runId={runQ.data?.run_id} recordId={recordId} />
      </Modal>
    </div>
  );
}
