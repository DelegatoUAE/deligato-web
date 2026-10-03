import { useState } from 'react';
import './components.css';
import './showcase.css';
import {
  Alert, AppShell, Avatar, Badge, Button, Card, ChipToggle, ConfidenceBadge, ConfirmDialog,
  Divider, Drawer, EmptyState, Fit, FitLegend, FitList, FitRow, FormField, Icon, Input,
  KanbanBoard, KanbanCard, KanbanColumn, Modal, PageHeader, Panel, ProgressBar, ProgressSteps,
  ScoreRing, Select, Skeleton, SkeletonCards, StatTile, Table, Tabs, Tag, Textarea, Toast,
  ToastProvider, Tooltip, useToast, READINESS_BANDS,
} from './ui/index.js';

/* ------------------------------------------------------------------
   Showcase: every primitive in every state, with realistic capital-
   access content. Mounted at /design by the Frontend agent, and by
   design-preview.html for visual checks. Sample companies and funds
   are fictional.
   ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'instruments', label: 'Score instruments', icon: 'gauge' },
  { id: 'fit', label: 'Fit and confidence', icon: 'target' },
  { id: 'foundations', label: 'Foundations', icon: 'layers' },
  { id: 'buttons', label: 'Buttons', icon: 'spark' },
  { id: 'surfaces', label: 'Cards and stats', icon: 'chart' },
  { id: 'journey', label: 'Journey', icon: 'compass' },
  { id: 'data', label: 'Tables and tabs', icon: 'file' },
  { id: 'pipeline', label: 'Pipeline', icon: 'kanban' },
  { id: 'forms', label: 'Forms', icon: 'edit' },
  { id: 'feedback', label: 'Feedback', icon: 'bell' },
  { id: 'overlays', label: 'Overlays', icon: 'folder' },
  { id: 'people', label: 'People and labels', icon: 'users' },
];

const JOURNEY = [
  'Capital Readiness', 'Company intelligence', 'Adaptive onboarding', 'Capital need', 'Eligibility',
  'Investor matching', 'Capital Match Score', 'Investor intelligence', 'Readiness improvement',
  'Package selection', 'Data room', 'Outreach', 'Fundraising CRM', 'Outcome tracking', 'Learning loop',
];

const FIT_ITEMS = [
  { label: 'Stage: Seed', state: 'yes', detail: 'Fund invests pre-seed to Series A; you are raising a seed round.' },
  { label: 'Sector: digital health', state: 'yes', detail: 'Healthtech is one of three stated focus sectors.' },
  { label: 'Cheque size: $500k–$1.5M', state: 'partial', detail: 'Your $2.5M round is above their usual ticket. They would need a co-investor.' },
  { label: 'Geography: GCC', state: 'no', detail: 'Mandate is limited to Europe and the UK; your HQ is Dubai.' },
  { label: 'Revenue threshold', state: 'unknown', detail: 'You have not added revenue yet. Add it to raise confidence; it will not count as a fit until then.' },
];

const SHORTLIST = [
  { id: 1, name: 'Harbourline Ventures', kind: 'VC fund', hq: 'Dubai', ticket: '$250k–$2M', score: 82, conf: 'high', fits: ['yes', 'yes', 'yes', 'partial'] },
  { id: 2, name: 'Meridian Health Partners', kind: 'Sector fund', hq: 'London', ticket: '$1M–$5M', score: 67, conf: 'medium', fits: ['yes', 'yes', 'no', 'yes'] },
  { id: 3, name: 'Sahel Angels Network', kind: 'Angel network', hq: 'Riyadh', ticket: '$50k–$400k', score: 54, conf: 'low', fits: ['yes', 'unknown', 'yes', 'unknown'] },
  { id: 4, name: 'Corniche Family Office', kind: 'Family office', hq: 'Abu Dhabi', ticket: 'Undisclosed', score: null, conf: 'low', fits: ['unknown', 'unknown', 'yes', 'unknown'] },
];
const FIT_KEYS = ['Stage', 'Sector', 'Geography', 'Ticket'];

function Section({ id, title, intro, children }) {
  return (
    <section id={id} className="sc-section" aria-labelledby={`${id}-h`}>
      <header className="sc-section-head">
        <h2 id={`${id}-h`}>{title}</h2>
        {intro && <p>{intro}</p>}
      </header>
      {children}
    </section>
  );
}

function Specimen({ label, children, wide = false, dark = false, flush = false }) {
  return (
    <figure className={`sc-specimen${wide ? ' is-wide' : ''}${flush ? ' is-flush' : ''}${dark ? ' is-dark ui-on-navy' : ''}`}>
      <div className="sc-specimen-body">{children}</div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function Swatch({ name, varName, hex, ink }) {
  return (
    <div className="sc-swatch">
      <div className="sc-swatch-chip" style={{ background: `var(${varName})`, color: ink ? 'var(--navy)' : '#fff' }}>
        <span>Aa</span>
      </div>
      <div className="sc-swatch-meta">
        <strong>{name}</strong>
        <code>{varName}</code>
        {hex && <span className="ui-num">{hex}</span>}
      </div>
    </div>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="ui-row">
      <Button variant="secondary" size="sm" onClick={() => toast.success('Outreach draft saved. You can edit it before you send.')}>Save draft</Button>
      <Button variant="secondary" size="sm" onClick={() => toast.error('Could not load investor profile. Check your connection and try again.')}>Trigger error</Button>
      <Button variant="secondary" size="sm" onClick={() => toast.push({ tone: 'info', title: 'Readiness updated', message: 'Your score moved from 58 to 64 after adding financials.' })}>Trigger info</Button>
    </div>
  );
}

function ShowcaseBody() {
  const [active, setActive] = useState('instruments');
  const [tab, setTab] = useState('fit');
  const [seg, setSeg] = useState('all');
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState(['Seed']);
  const [tags, setTags] = useState(['Digital health', 'B2B SaaS', 'GCC']);
  const [loadingBtn, setLoadingBtn] = useState(false);

  const nav = [
    { title: 'Design system', items: SECTIONS.map((s) => ({ ...s, href: `#${s.id}`, active: active === s.id, onClick: () => setActive(s.id) })) },
  ];

  return (
    <AppShell
      nav={nav}
      user={{ name: 'Layla Haddad', sub: 'Founder, Lumen Health' }}
      title="Design system"
      topActions={(
        <>
          <Badge tone="gold" size="sm">v1 · 3 Oct 2026</Badge>
          <Button variant="secondary" size="sm" iconLeft="download">Tokens</Button>
        </>
      )}
    >
      <PageHeader
        breadcrumbs={[{ label: 'Capital Access', href: '#' }, { label: 'Design system' }]}
        title="Capital Access design system"
        subtitle="Conncct navy, gold and cream, set in Poppins. Every component below is the real primitive, rendered in each of its states."
        meta={<><Tag>React 19</Tag><Tag>Plain CSS</Tag><Tag>{SECTIONS.length} sections</Tag></>}
      />

      {/* ---------------- Hero: the two instruments in context ---------- */}
      <div className="sc-hero">
        <ScoreRing
          variant="readiness"
          value={64}
          band="Semi-ready"
          bandTone="semi"
          caption="Good preparation. Three factors are holding the score back."
          showBands
        />
        <Card className="sc-hero-match" title="Harbourline Ventures" subtitle="VC fund, Dubai. Seed to Series A, $250k–$2M." action={<Avatar name="Harbourline Ventures" shape="org" size={40} />}>
          <div className="sc-hero-match-body">
            <ScoreRing variant="match" value={82} confidence="high" />
            <FitList label="Fit with Harbourline" items={FIT_ITEMS.slice(0, 4).map((f, i) => (i === 3 ? { ...f, state: 'yes', detail: 'Dubai and wider GCC are in mandate.' } : f))} />
          </div>
          <div className="sc-hero-actions">
            <Button variant="accent" iconLeft="send">Draft an intro</Button>
            <Button variant="ghost">View investor profile</Button>
            <span className="sc-hero-note">Drafts only. You review and send every message yourself.</span>
          </div>
        </Card>
      </div>

      {/* ---------------- Instruments ---------------- */}
      <Section
        id="instruments"
        title="Score instruments"
        intro="Readiness is a dial on navy with the Conncct band scale. Capital Match is a segmented ring on a light surface. They never share a shape, so a founder cannot mistake one score for the other."
      >
        <div className="sc-grid-4">
          <Specimen flush label="Readiness, critical"><ScoreRing value={18} band="Critical risk" bandTone="critical" size="sm" /></Specimen>
          <Specimen flush label="Readiness, medium"><ScoreRing value={46} band="Medium risk" bandTone="medium" size="sm" /></Specimen>
          <Specimen flush label="Readiness, investor-ready"><ScoreRing value={88} band="Investor-ready" bandTone="ready" size="sm" /></Specimen>
          <Specimen flush label="Readiness, not scored"><ScoreRing value={null} caption="Answer 14 questions to get a score." size="sm" /></Specimen>
        </div>
        <div className="sc-bands" aria-label="Readiness bands">
          {READINESS_BANDS.map((b) => (
            <span key={b.tone} className={`sc-band ui-band-${b.tone}`}><i />{b.label}</span>
          ))}
        </div>
        <div className="sc-grid-5">
          <Specimen label="Match, high confidence"><ScoreRing variant="match" value={82} confidence="high" /></Specimen>
          <Specimen label="Match, medium confidence"><ScoreRing variant="match" value={67} confidence="medium" /></Specimen>
          <Specimen label="Match, low confidence"><ScoreRing variant="match" value={54} confidence="low" caption="Two criteria unknown" /></Specimen>
          <Specimen label="Match, not enough data"><ScoreRing variant="match" value={null} confidence="low" /></Specimen>
          <Specimen label="Match, sizes sm and lg">
            <div className="ui-row"><ScoreRing variant="match" value={71} size="sm" confidence="high" showConfidence={false} /><ScoreRing variant="match" value={91} size="lg" confidence="high" showConfidence={false} /></div>
          </Specimen>
        </div>
      </Section>

      {/* ---------------- Fit ---------------- */}
      <Section
        id="fit"
        title="Fit and confidence"
        intro="Four fit states that differ in shape, glyph and word, not only colour. Unknown is a dashed ring with a question mark and is never green: missing data lowers confidence and never counts as a match."
      >
        <div className="sc-split">
          <Card title="Eligibility for Meridian Health Partners" subtitle="Five criteria from the fund's published mandate.">
            <FitList label="Eligibility criteria" items={FIT_ITEMS} />
            <Divider />
            <FitLegend />
          </Card>
          <div className="ui-stack">
            <Specimen label="Inline chips (lists and tables)">
              <div className="ui-row">
                <Fit state="yes" label="Stage" />
                <Fit state="partial" label="Ticket" />
                <Fit state="no" label="Geography" />
                <Fit state="unknown" label="Revenue" />
              </div>
            </Specimen>
            <Specimen label="On a navy surface" dark>
              <ul className="ui-fitlist">
                <FitRow state="yes" label="Sector" />
                <FitRow state="partial" label="Ticket size" />
                <FitRow state="no" label="Geography" />
                <FitRow state="unknown" label="Traction" />
              </ul>
            </Specimen>
            <Specimen label="Confidence">
              <div className="ui-row">
                <ConfidenceBadge level="high" />
                <ConfidenceBadge level="medium" />
                <ConfidenceBadge level="low" />
                <ConfidenceBadge level="low" size="sm" />
              </div>
            </Specimen>
          </div>
        </div>
      </Section>

      {/* ---------------- Foundations ---------------- */}
      <Section id="foundations" title="Foundations" intro="Navy carries structure, gold signals your number and the next step, cream is the page. Neutrals are cool and navy-tinted so greys never turn muddy against cream.">
        <div className="sc-swatches">
          <Swatch name="Navy" varName="--navy" hex="#051C38" />
          <Swatch name="Sub-navy" varName="--navy-2" hex="#2A4A73" />
          <Swatch name="Gold" varName="--gold" hex="#E7A81E" ink />
          <Swatch name="Dark gold" varName="--gold-dark" hex="#B8860B" />
          <Swatch name="Cream" varName="--cream" hex="#F8F5EF" ink />
          <Swatch name="Success" varName="--ok-600" hex="#15803D" />
          <Swatch name="Danger" varName="--bad-600" hex="#C00000" />
          <Swatch name="Info" varName="--info-600" hex="#1D6FA5" />
        </div>
        <div className="sc-scales">
          {[
            ['navy', ['950', '900', '800', '', '700', '600', '2', '400', '300', '200', '100', '050']],
            ['gold', ['800', '700', 'dark', '', '400', '300', '200', '100', '050']],
            ['n', ['900', '800', '700', '600', '500', '400', '300', '200', '100', '050']],
          ].map(([k, steps]) => (
            <div className="sc-scale" key={k}>
              {steps.map((s) => {
                const v = s === '' ? `--${k}` : `--${k}-${s}`;
                return <span key={v} title={v} style={{ background: `var(${v})` }} />;
              })}
            </div>
          ))}
        </div>
        <div className="sc-type">
          {[
            ['--text-5xl', '48', 'Score figures', '64'],
            ['--text-4xl', '36', 'Page title', 'Investor matches'],
            ['--text-2xl', '22', 'Section', 'Capital need'],
            ['--text-lg', '16', 'Body', 'We help you with fundraising. We never fundraise for you.'],
            ['--text-md', '14', 'Dense UI', 'Cheque size $250k–$2M, seed to Series A'],
            ['--text-xs', '12', 'Meta', 'Updated 3 Oct 2026, 14:20'],
          ].map(([v, px, role, sample]) => (
            <div className="sc-type-row" key={v}>
              <span className="sc-type-meta"><code>{v}</code><span className="ui-num">{px}px</span><span>{role}</span></span>
              <span className="sc-type-sample ui-num" style={{ fontSize: `var(${v})` }}>{sample}</span>
            </div>
          ))}
        </div>
        <div className="sc-grid-4">
          <Specimen label="Radii by hierarchy">
            <div className="sc-radii">{['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((r) => <span key={r} style={{ borderRadius: `var(--r-${r})` }}>{r}</span>)}</div>
          </Specimen>
          <Specimen label="Elevation">
            <div className="sc-radii">{['xs', 'sm', 'md', 'lg', 'xl'].map((r) => <span key={r} style={{ boxShadow: `var(--shadow-${r})`, background: 'var(--surface)' }}>{r}</span>)}</div>
          </Specimen>
          <Specimen label="Spacing (4px base)">
            <div className="sc-space">{[1, 2, 3, 4, 6, 8, 12].map((s) => <span key={s} style={{ width: `var(--s-${s})` }} title={`--s-${s}`} />)}</div>
          </Specimen>
          <Specimen label="Focus ring (tab to it)">
            <div className="ui-row"><Button variant="secondary">Focus me</Button><Input placeholder="or me" style={{ maxWidth: 120 }} /></div>
          </Specimen>
        </div>
      </Section>

      {/* ---------------- Buttons ---------------- */}
      <Section id="buttons" title="Buttons" intro="Navy for the main action, gold for the one call that moves the journey forward. Use one gold button per view.">
        <div className="sc-btn-grid">
          {['primary', 'accent', 'secondary', 'ghost', 'danger', 'link'].map((v) => (
            <div className="sc-btn-row" key={v}>
              <code>{v}</code>
              <Button variant={v} size="sm">Small</Button>
              <Button variant={v}>Medium</Button>
              <Button variant={v} size="lg">Large</Button>
              <Button variant={v} disabled>Disabled</Button>
              {v !== 'link' && <Button variant={v} loading>Saving</Button>}
            </div>
          ))}
        </div>
        <div className="ui-row" style={{ marginTop: 'var(--s-5)' }}>
          <Button iconLeft="plus">Add company</Button>
          <Button variant="accent" iconRight="arrowRight">Continue to matching</Button>
          <Button variant="secondary" iconOnly aria-label="Search"><Icon name="search" /></Button>
          <Button variant="primary" loading={loadingBtn} onClick={() => { setLoadingBtn(true); setTimeout(() => setLoadingBtn(false), 1600); }}>Recalculate score</Button>
          <Tooltip text="Opens the readiness methodology"><Button variant="ghost" iconLeft="info">How is this scored?</Button></Tooltip>
        </div>
        <Panel title="On navy" subtitle="Buttons re-point automatically inside a navy panel." className="sc-mt">
          <div className="ui-row">
            <Button>Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </Panel>
      </Section>

      {/* ---------------- Cards + stats ---------------- */}
      <Section id="surfaces" title="Cards, panels and stats">
        <div className="sc-grid-4">
          <StatTile label="Investors matched" value="38" delta={{ value: '+6', direction: 'up', label: 'since profile update' }} />
          <StatTile label="Target raise" value="2.5" unit="$M" foot="Seed, SAFE" />
          <StatTile label="Data room complete" value="72" unit="%" delta={{ value: '−4', direction: 'down', label: 'two files expired' }} tone="gold" />
          <StatTile label="Replies this month" value="—" loading />
        </div>
        <div className="sc-grid-3 sc-mt">
          <Card eyebrow="Readiness improvement" title="Add reviewed financial statements" subtitle="Biggest single lift to your score: about +9 points." footer={<><Icon name="file" /> Takes about 2 hours</>}>
            <ProgressBar label="Financial readiness" value={35} tone="gold" />
          </Card>
          <Card tone="sunken" title="Sunken card" subtitle="For secondary groupings inside a page.">
            <ProgressBar label="Profile completeness" value={88} tone="brand" />
          </Card>
          <Card interactive selected title="Selected, interactive" subtitle="Gold edge marks the chosen package." action={<Badge tone="gold">Recommended</Badge>}>
            <p className="ui-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Foundations, $2,999 one-off.</p>
          </Card>
        </div>
        <div className="sc-grid-2 sc-mt">
          <Panel eyebrow="This week" title="Three things to do next" subtitle="Ordered by expected lift to your readiness score.">
            <div className="ui-grid-3 ui-grid">
              <StatTile tone="navy" label="Readiness" value="64" unit="/100" delta={{ value: '+6', direction: 'up' }} />
              <StatTile tone="navy" label="Matches" value="38" />
              <StatTile tone="navy" label="Drafts" value="4" foot="awaiting your review" />
            </div>
          </Panel>
          <Panel tone="cream" title="Cream panel" subtitle="A quiet inset for guidance, tips and methodology notes.">
            <Alert tone="brand" title="How matching works">Fit is checked against each investor's published mandate. Missing data lowers confidence; it never counts as a fit.</Alert>
          </Panel>
        </div>
      </Section>

      {/* ---------------- Journey ---------------- */}
      <Section id="journey" title="Journey" intro="The founder's path through capital access. Horizontal on wide screens, a compact vertical rail beside content.">
        <Card padded>
          <ProgressSteps
            label="Founder journey"
            steps={JOURNEY.slice(0, 8).map((label, i) => ({
              label,
              description: i === 5 ? '38 investors found' : undefined,
              status: i < 5 ? 'done' : i === 5 ? 'current' : i === 7 ? 'blocked' : 'upcoming',
            }))}
          />
        </Card>
        <div className="sc-split sc-mt">
          <Card title="Full journey, compact rail">
            <ProgressSteps orientation="vertical" compact current={5} steps={JOURNEY.map((label) => ({ label }))} />
          </Card>
          <Card title="Vertical with descriptions">
            <ProgressSteps
              orientation="vertical"
              steps={[
                { label: 'Capital Readiness', description: 'Scored 64, semi-ready.', status: 'done' },
                { label: 'Capital need', description: '$2.5M seed on a SAFE, 18 months of runway.', status: 'done' },
                { label: 'Investor matching', description: 'Reviewing 38 matches.', status: 'current' },
                { label: 'Data room', description: 'Needs your cap table before it can open.', status: 'blocked' },
                { label: 'Outreach', description: 'Draft intros you send yourself.', status: 'upcoming' },
              ]}
            />
          </Card>
        </div>
      </Section>

      {/* ---------------- Tables + tabs ---------------- */}
      <Section id="data" title="Tables and tabs">
        <Tabs
          label="Investor views"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'fit', label: 'Best fit', count: 12 },
            { id: 'partial', label: 'Partial fit', count: 19 },
            { id: 'excluded', label: 'Not eligible', count: 7 },
            { id: 'saved', label: 'Saved', disabled: true },
          ]}
        >
          {(id) => (id === 'excluded' ? (
            <EmptyState compact icon="target" title="No exclusions in this filter" body="Investors whose mandate rules you out appear here, with the reason." />
          ) : (
            <Table
              caption="Shortlist"
              rowKey="id"
              onRowClick={() => setDrawer(true)}
              rows={SHORTLIST}
              columns={[
                { key: 'name', header: 'Investor', render: (r) => (
                  <span className="ui-who"><Avatar name={r.name} shape="org" size={32} /><span className="ui-who-text"><span className="ui-who-name">{r.name}</span><span className="ui-who-sub">{r.kind}, {r.hq}</span></span></span>
                ) },
                { key: 'fits', header: 'Fit', render: (r) => (
                  <span className="ui-row" style={{ gap: 6 }}>{r.fits.map((f, i) => <Fit key={FIT_KEYS[i]} state={f} label={FIT_KEYS[i]} />)}</span>
                ) },
                { key: 'ticket', header: 'Ticket', numeric: true },
                { key: 'conf', header: 'Confidence', render: (r) => <ConfidenceBadge level={r.conf} size="sm" label="" /> },
                { key: 'score', header: 'Match', align: 'center', render: (r) => <ScoreRing variant="match" size="sm" value={r.score} confidence={r.conf} showConfidence={false} /> },
              ]}
            />
          ))}
        </Tabs>
        <div className="sc-grid-2 sc-mt">
          <Specimen label="Pill tabs (filters)">
            <Tabs variant="pill" label="Investor type" value={seg} onChange={setSeg} items={[{ id: 'all', label: 'All' }, { id: 'vc', label: 'VC' }, { id: 'angel', label: 'Angels' }, { id: 'fo', label: 'Family offices' }]} />
          </Specimen>
          <Specimen label="Loading and empty table" wide>
            <Table dense loading loadingRows={2} columns={[{ key: 'a', header: 'Investor' }, { key: 'b', header: 'Ticket', numeric: true }]} rows={[]} />
          </Specimen>
        </div>
      </Section>

      {/* ---------------- Pipeline ---------------- */}
      <Section id="pipeline" title="Fundraising pipeline" intro="CRM stages for conversations the founder runs. Nothing moves to Sent until the founder sends it.">
        <KanbanBoard label="Fundraising pipeline">
          <KanbanColumn title="Drafted" count={2} tone="neutral">
            <KanbanCard leading={<Avatar name="Harbourline Ventures" shape="org" size={30} />} title="Harbourline Ventures" meta="Intro draft ready for your review" score="82" footer={<><Badge tone="neutral" size="sm">Warm intro</Badge><span>Edited today</span></>} onClick={() => setDrawer(true)} />
            <KanbanCard leading={<Avatar name="Sahel Angels Network" shape="org" size={30} />} title="Sahel Angels Network" meta="Cold email draft" score="54" footer={<ConfidenceBadge level="low" size="sm" />} onClick={() => {}} />
          </KanbanColumn>
          <KanbanColumn title="Sent by you" count={1} tone="navy">
            <KanbanCard leading={<Avatar name="Meridian Health Partners" shape="org" size={30} />} title="Meridian Health Partners" meta="Sent 26 Sep" score="67" stale footer={<Badge tone="gold" size="sm" dot>Follow up due</Badge>} onClick={() => {}} />
          </KanbanColumn>
          <KanbanColumn title="Meeting" count={1} tone="gold" isOver>
            <KanbanCard leading={<Avatar name="Qasr Capital" shape="org" size={30} />} title="Qasr Capital" meta="Call on 7 Oct, 10:00" score="76" footer={<><Avatar name="Omar Said" size={20} /><span>Omar Said, Partner</span></>} onClick={() => {}} />
            <KanbanCard dragging title="Dragging card" meta="Shows lift while moving" />
          </KanbanColumn>
          <KanbanColumn title="Diligence" count={0} tone="info" empty="No investor is in diligence yet" />
          <KanbanColumn title="Closed" count={0} tone="ok" empty="Commitments land here" />
          <KanbanColumn title="Passed" count={1} tone="bad">
            <KanbanCard title="Northgate Seed Fund" meta="Passed: too early for their fund" footer={<Badge tone="outline" size="sm">Reason logged</Badge>} />
          </KanbanColumn>
        </KanbanBoard>
      </Section>

      {/* ---------------- Forms ---------------- */}
      <Section id="forms" title="Forms">
        <Card>
          <form className="ui-form ui-form-2" onSubmit={(e) => e.preventDefault()}>
            <FormField label="Company name" required hint="As registered.">
              <Input defaultValue="Lumen Health" />
            </FormField>
            <FormField label="Target raise" hint="In US dollars. You can change it later.">
              <Input prefix="$" numeric defaultValue="2,500,000" />
            </FormField>
            <FormField label="Instrument">
              <Select placeholder="Choose an instrument" options={['SAFE', 'Convertible note', 'Priced equity', 'Venture debt']} defaultValue="SAFE" />
            </FormField>
            <FormField label="Monthly revenue" error="Enter a number, for example 42000. Leave it blank if you are pre-revenue.">
              <Input numeric defaultValue="about 40k" />
            </FormField>
            <FormField label="Use of funds" optional wide hint="Two or three sentences. Investors read this first.">
              <Textarea placeholder="Hire two engineers, complete the clinical pilot in Riyadh, ..." />
            </FormField>
            <FormField label="Stage" wide>
              {() => <ChipToggle label="Stage" options={['Pre-seed', 'Seed', 'Series A', 'Series B+']} value={stages} onChange={setStages} />}
            </FormField>
            <FormField label="Disabled field" hint="Locked after your score is calculated.">
              <Input disabled defaultValue="Dubai, UAE" />
            </FormField>
            <div className="ui-row" style={{ alignSelf: 'end' }}>
              <Button type="submit">Save company</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
          </form>
        </Card>
      </Section>

      {/* ---------------- Feedback ---------------- */}
      <Section id="feedback" title="Feedback" intro="Toasts replace alert(). Alerts stay in the page. Empty states say what the thing is, why it is empty, and the one action that fills it.">
        <div className="sc-split">
          <div className="ui-stack">
            <Alert tone="info" title="Matching uses public mandates">We check each fund's published criteria. You can correct anything that looks wrong.</Alert>
            <Alert tone="ok" title="Data room ready">All 14 required documents are uploaded.</Alert>
            <Alert tone="warn" title="Two documents expire this month" action={<Button size="sm" variant="secondary">Review</Button>}>Your trade licence and bank letter need renewing.</Alert>
            <Alert tone="bad" title="Upload failed" onDismiss={() => {}}>cap-table.xlsx is over 25 MB. Export a smaller file and try again.</Alert>
          </div>
          <div className="ui-stack">
            <Toast inline tone="ok" message="Outreach draft saved." onDismiss={() => {}} />
            <Toast inline tone="info" title="Readiness updated" message="Your score moved from 58 to 64." onDismiss={() => {}} />
            <Toast inline tone="bad" title="Could not allocate" message="The investor record changed. Reload and try again." action={<Button size="sm" variant="accent">Reload</Button>} />
            <ToastDemo />
          </div>
        </div>
        <div className="sc-grid-3 sc-mt">
          <EmptyState icon="target" title="No investor matches yet" body="Matches appear once your capital need is set: how much, which instrument and what for." action={<Button variant="accent">Set capital need</Button>} />
          <EmptyState tone="gold" icon="folder" title="Your data room is empty" body="Start with the five documents every investor asks for first." action={<Button variant="secondary" iconLeft="plus">Add documents</Button>} />
          <Card title="Loading">
            <div className="ui-stack">
              <div className="ui-row"><Skeleton variant="circle" w="40px" /><div style={{ flex: 1 }}><Skeleton variant="text" lines={2} /></div></div>
              <SkeletonCards count={2} height={56} />
            </div>
          </Card>
        </div>
      </Section>

      {/* ---------------- Overlays ---------------- */}
      <Section id="overlays" title="Overlays" intro="Escape closes, focus is trapped inside and returns to the button that opened it. Modals become bottom sheets on phones.">
        <div className="ui-row">
          <Button onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>Delete data room</Button>
        </div>
      </Section>

      {/* ---------------- People + labels ---------------- */}
      <Section id="people" title="People and labels">
        <div className="sc-grid-3">
          <Specimen label="Avatars: people, organisations, group">
            <div className="ui-stack ui-stack-sm">
              <div className="ui-row">
                <Avatar name="Layla Haddad" size={44} ring />
                <Avatar name="Omar Said" size={36} />
                <Avatar name="Priya Raman" size={28} />
                <Avatar name="Harbourline Ventures" shape="org" size={44} />
                <Avatar name="Qasr Capital" shape="org" size={36} />
              </div>
              <span className="ui-avatars">{['Layla Haddad', 'Omar Said', 'Priya Raman', 'Jonas Weber'].map((n) => <Avatar key={n} name={n} size={30} />)}</span>
              <span className="ui-who"><Avatar name="Omar Said" /><span className="ui-who-text"><span className="ui-who-name">Omar Said</span><span className="ui-who-sub">Partner, Qasr Capital</span></span></span>
            </div>
          </Specimen>
          <Specimen label="Badges">
            <div className="ui-row">
              {['neutral', 'brand', 'gold', 'ok', 'warn', 'bad', 'info', 'outline'].map((t) => <Badge key={t} tone={t}>{t}</Badge>)}
              <Badge tone="ok" dot>Sent by you</Badge>
              <Badge tone="gold" size="sm" dot>Follow up</Badge>
            </div>
          </Specimen>
          <Specimen label="Tags: static, removable, toggle">
            <div className="ui-stack ui-stack-sm">
              <div className="ui-tags">{tags.map((t) => <Tag key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>{t}</Tag>)}</div>
              <div className="ui-tags">
                <Tag>Seed</Tag>
                <Tag selected onClick={() => {}}>Selected</Tag>
                <Tag onClick={() => {}}>Toggle</Tag>
              </div>
            </div>
          </Specimen>
        </div>
      </Section>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Choose how to approach Harbourline"
        description="Pick the route. We draft the message; you review and send it from your own email."
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button variant="accent" onClick={() => setModal(false)}>Draft message</Button></>}
      >
        <div className="ui-stack ui-stack-sm">
          <Card interactive selected padded title="Warm introduction" subtitle="Through Omar Said, who backed your previous company." />
          <Card interactive padded title="Direct email" subtitle="To the partner covering digital health." />
        </div>
      </Modal>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Harbourline Ventures"
        description="VC fund, Dubai. Last verified 21 Sep 2026."
        footer={<><Button variant="ghost" onClick={() => setDrawer(false)}>Close</Button><Button variant="accent" iconLeft="send">Draft an intro</Button></>}
      >
        <div className="ui-stack">
          <div className="ui-row" style={{ alignItems: 'center' }}>
            <ScoreRing variant="match" value={82} confidence="high" />
            <div className="ui-stack ui-stack-sm" style={{ flex: 1, minWidth: 180 }}>
              <StatTile label="Ticket" value="$250k–$2M" />
              <StatTile label="Deals in 2026" value="11" />
            </div>
          </div>
          <FitList label="Fit" items={FIT_ITEMS.slice(0, 3)} />
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirm}
        title="Delete the Lumen Health data room?"
        body="This removes 23 documents and the access log for 4 investors. Investors with a link lose access straight away. This cannot be undone."
        confirmLabel="Delete data room"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setBusy(true); setTimeout(() => { setBusy(false); setConfirm(false); }, 1200); }}
      />
    </AppShell>
  );
}

export default function Showcase() {
  return (
    <ToastProvider>
      <ShowcaseBody />
    </ToastProvider>
  );
}
