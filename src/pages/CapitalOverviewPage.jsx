import { Link } from 'react-router-dom';
import { Button, Card, PageHeader, ProgressSteps, Skeleton, StatTile } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { listPipeline } from '../lib/capital';
import { getDataRoom } from '../lib/fundraising';
import { bandLabel } from '../lib/readiness';
import { FundraisingNotice } from '../components/capital/bits';
import { fmtInt, fmtUsd, POSITIONING } from '../lib/format';
import { pipelineCounts } from '../lib/home';

export default function CapitalOverviewPage() {
  const { company, companyId, readiness, run, runLoading, capitalNeedConfirmed } = useCompany();
  const pipeQ = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []), [companyId]);
  const drQ = useApi(() => getDataRoom(companyId), [companyId]);
  const r = readiness?.readiness;
  const pipeline = pipeQ.data;
  const gated = pipeQ.error?.status === 402;
  const pc = pipelineCounts(pipeQ.data);
  const bucket = (k) => run?.counts?.[`${k}_bucket`] ?? run?.results.filter((x) => x.bucket === k).length;

  const steps = [
    { label: 'Company', description: 'Done', status: 'done', href: '/company' },
    { label: 'Readiness', description: r ? bandLabel(r) : 'Not scored', status: r ? 'done' : 'current', href: '/capital/readiness' },
    { label: 'Capital need', description: capitalNeedConfirmed ? `${fmtUsd(company.raise_usd) || ''} ${company.instrument || ''}` : 'To confirm', status: capitalNeedConfirmed ? 'done' : 'current', href: '/capital/find?step=need' },
    { label: 'Routes and matches', description: run ? `${fmtInt(run.counts?.eligible)} eligible` : 'Not run yet', status: run ? 'done' : capitalNeedConfirmed ? 'current' : 'upcoming', href: '/capital/find?step=routing' },
    { label: 'Saved and pipeline', description: gated ? 'From Investor-Ready' : pipeline ? `${pc.saved} saved · ${pc.inPipeline} in pipeline` : '', status: pipeline?.length ? 'done' : 'upcoming', href: '/capital/pipeline' },
    { label: 'Data room', description: drQ.data ? `${drQ.data.completeness_pct}% ready` : '', status: drQ.data?.completeness_pct >= 100 ? 'done' : 'upcoming', href: '/capital/data-room' },
  ];

  return (
    <div>
      <SubNav section="capital" />
      <PageHeader title="Capital" subtitle={POSITIONING}
        actions={<Button as={Link} to="/capital/find" variant="accent" size="lg">Find the right capital</Button>} />
      <section className="home-stats" aria-label="Capital at a glance">
        <StatTile as={Link} to="/capital/matches" label="Verified fits" loading={runLoading} value={run ? fmtInt(bucket('eligible')) : 'Not yet'} foot={run ? `${fmtInt(bucket('possible'))} possible · ${fmtInt(bucket('likely_outside'))} likely outside` : 'Appears after your first match'} />
        <StatTile as={Link} to="/capital/matches" label="Pass the hard filters" loading={runLoading} value={run ? fmtInt(run.counts?.eligible) : 'Not yet'} foot={run?.counts?.considered ? `of ${fmtInt(run.counts.considered)} active sources` : ''} />
        <StatTile as={Link} to="/capital/pipeline" label="In pipeline" loading={!pipeline && !gated && !pipeQ.error} value={gated ? 'Locked' : pipeline ? pc.inPipeline : 'Couldn\'t load'} foot={gated ? 'Included from Investor-Ready' : pipeline ? `${pc.saved} saved` : ''} />
        <StatTile as={Link} to="/capital/data-room" label="Data room" loading={drQ.loading && !drQ.data && !drQ.error} value={drQ.data ? `${drQ.data.completeness_pct}%` : drQ.error ? 'Not yet' : ''} foot={drQ.data ? `${drQ.data.done_count} of ${drQ.data.required_count} required items` : drQ.error ? 'Not available yet' : ''} />
      </section>
      <Card title="Your capital journey">
        {runLoading ? <Skeleton h="80px" /> : <ProgressSteps steps={steps} />}
      </Card>
      <div className="ui-grid ui-grid-3 overview-links">
        <Card interactive as={Link} to="/capital/improve" title="Improve your matches" subtitle="What would open more, or better, investors, with the cost of each change." />
        <Card interactive as={Link} to="/capital/outreach" title="Outreach" subtitle="Drafts you edit and send yourself." />
        <Card interactive as={Link} to="/capital/insights" title="Insights" subtitle="What's working in your raise, and whether our fit predictions held." />
        <Card interactive as={Link} to="/packages" title="Packages" subtitle="Help with your raise, at the depth you need." />
      </div>
      <FundraisingNotice />
    </div>
  );
}
