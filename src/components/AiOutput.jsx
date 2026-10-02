import { Badge } from '../design/ui';
import { humanise } from '../lib/format';

const SKIP = new Set(['record_id', 'name', 'cited_facts', 'company_id', 'placeholders', 'personalisation_points']);
const text = (x) => (typeof x === 'object' && x !== null ? (x.text || x.label || x.point || x.reason || x.value || x.field || '') : String(x));

/** Renders an intelligence task result: which path ran, then each field. */
export default function AiOutput({ result }) {
  if (!result) return null;
  const ai = result.provider && result.provider !== 'heuristic';
  return (
    <div className="assist-result">
      <div className="ui-row">
        <Badge tone={ai ? 'gold' : 'outline'}>{ai ? 'AI-drafted' : 'Rules-based'}</Badge>
        {result.notice && <span className="ui-muted assist-notice">{result.notice}</span>}
      </div>
      {Object.entries(result.output || {}).filter(([k]) => !SKIP.has(k)).map(([k, v]) => {
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v))) return null;
        return (
          <section key={k}>
            <h4>{humanise(k)}</h4>
            {Array.isArray(v) ? <ul className="assist-list">{v.map((x, i) => <li key={i}>{text(x)}</li>)}</ul> : <p>{String(v)}</p>}
          </section>
        );
      })}
    </div>
  );
}
