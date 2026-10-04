import { Link } from 'react-router-dom';
import { Badge, Button, Icon } from '../../design/ui';
import { fmtDate, plainIntel } from '../../lib/format';
import { askAi } from '../../lib/ask';
import { upgradeHref } from '../../lib/plan';

/**
 * D57 §9 trust: every important number answers What is this? Where from?
 * Updated when? Why does it matter? Shown on request (progressive disclosure).
 */
export function TrustNote({ what, source, updated, updatedText, why, label = 'About this number' }) {
  return (
    <details className="trust">
      <summary>{label}</summary>
      <dl>
        {what && <div><dt>What it is</dt><dd>{what}</dd></div>}
        {source && <div><dt>Where it comes from</dt><dd>{source}</dd></div>}
        <div><dt>Updated</dt><dd>{updatedText || (updated ? fmtDate(updated) : 'Not calculated yet')}</dd></div>
        {why && <div><dt>Why it matters</dt><dd>{why}</dd></div>}
      </dl>
    </details>
  );
}

/** A quiet plan line: what the plan shows now, and the one way to see more. */
export function UpgradeLine({ note, to = 'capital-raising', cta = 'See plans' }) {
  if (!note) return null;
  return (
    <p className="upline"><Icon name="lock" /> <span>{note}</span> <Link to={upgradeHref(to)}>{cta}</Link></p>
  );
}

const DIR = { up: { mark: '▲', word: 'up' }, down: { mark: '▼', word: 'down' }, flat: { mark: '■', word: 'unchanged' } };
export function Delta({ direction, children }) {
  if (!direction) return children ? <span className="delta">{children}</span> : null;
  const d = DIR[direction] || DIR.flat;
  return (
    <span className={`delta delta-${direction}`}>
      <span aria-hidden="true">{d.mark}</span><span className="ui-sr">{d.word}</span> {children}
    </span>
  );
}

/** "What changed": meaningful events only (D58 §3); each says when and how it changed. */
export function ChangeList({ items, empty = 'Nothing material has changed recently.', limit }) {
  const list = (items || []).slice(0, limit || undefined);
  if (!list.length) return <p className="ui-muted cc-empty">{empty}</p>;
  return (
    <ul className="changes">
      {list.map((c) => (
        <li key={c.id} className={`change change-${c.direction || 'none'}`}>
          <span className="change-mark" aria-hidden="true" />
          <div>
            <p className="change-title">{plainIntel(c.title)}</p>
            {c.detail && <p className="change-detail">{plainIntel(c.detail)}</p>}
          </div>
          <time className="change-at" dateTime={c.at}>{fmtDate(c.at)}</time>
        </li>
      ))}
    </ul>
  );
}

const SEV = { high: { tone: 'bad', label: 'Now' }, medium: { tone: 'warn', label: 'Soon' }, low: { tone: 'neutral', label: 'Later' } };
export function AttentionList({ items, empty = 'Nothing needs your attention right now.' }) {
  const list = items || [];
  if (!list.length) return <p className="ui-muted cc-empty">{empty}</p>;
  return (
    <ul className="attn">
      {list.map((a) => {
        const s = SEV[a.severity] || SEV.low;
        const internal = typeof a.route === 'string' && a.route.startsWith('/');
        return (
          <li key={a.id} className="attn-item">
            <Badge tone={s.tone} size="sm" dot>{s.label}</Badge>
            <div className="attn-main">
              <p className="attn-title">{plainIntel(a.title)}</p>
              {a.detail && <p className="attn-detail">{plainIntel(a.detail)}</p>}
              {/* Free shows the problem; the diagnosis is a plan feature (Bilal, 4 Oct). */}
              {a.locked?.note && <UpgradeLine note={a.locked.note} />}
            </div>
            {internal && <Button as={Link} to={a.route} variant="link" size="sm">Open</Button>}
          </li>
        );
      })}
    </ul>
  );
}

/** Native Ask AI prompts: open the one assistant with this question. */
export function AskPrompts({ prompts, title = 'Ask about this' }) {
  if (!prompts?.length) return null;
  return (
    <div className="askp">
      <span className="askp-h"><Icon name="spark" /> {title}</span>
      <div className="askp-list">
        {prompts.map((p) => <button key={p} type="button" className="askp-q" onClick={() => askAi(p)}>{p}</button>)}
      </div>
    </div>
  );
}

/** "Need specialist help?" (D47/D50): one calm text link, never first, never a button. */
export function SpecialistLink({ help }) {
  if (!help?.route) return null;
  return (
    <p className="specialist">
      <Link to={help.route}>{help.label || 'Need specialist help?'}</Link>
      {help.why ? <span className="ui-faint"> {help.why}</span> : null}
    </p>
  );
}
