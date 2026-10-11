import { fmtInt } from '../../../lib/format';

const STEPS = [
  { key: 'eligible', label: 'Verified fit', note: 'Every decisive fact on record' },
  { key: 'possible', label: 'Possible', note: 'At least one decisive fact unknown' },
  { key: 'likely_outside', label: 'Likely outside', note: 'Their criteria suggest not' },
];

/**
 * EvidenceLadder: the run's three evidence buckets as one proportional bar, and the
 * filter for them. Widths come from the run's own counts; a small bucket keeps a
 * minimum sliver so it never disappears. Nothing here ranks or rescores.
 * counts: { eligible, possible, likely_outside }. value: '' (all) or a bucket key.
 */
export default function EvidenceLadder({ counts, value = '', onChange, scopeNote = null }) {
  const total = STEPS.reduce((s, b) => s + (counts[b.key] || 0), 0);
  return (
    <section className="mx-ladder" aria-label="Matches by evidence">
      <div className="mx-ladder-bar" aria-hidden="true">
        {STEPS.filter((b) => (counts[b.key] || 0) > 0).map((b) => (
          <i key={b.key} className={`mx-seg mx-seg-${b.key}${value && value !== b.key ? ' is-dim' : ''}`}
            style={{ flexGrow: Math.max(counts[b.key] || 0, total ? total * 0.04 : 1) }} />
        ))}
      </div>
      <div className="mx-ladder-keys" role="group" aria-label="Show evidence tier">
        <button type="button" className={`mx-key mx-key-all${value === '' ? ' is-on' : ''}`} aria-pressed={value === ''} onClick={() => onChange('')}>
          <span className="mx-key-n">{fmtInt(total)}</span>
          <span className="mx-key-l">All tiers</span>
          {scopeNote && <span className="mx-key-note">{scopeNote}</span>}
        </button>
        {STEPS.map((b) => (
          <button key={b.key} type="button" className={`mx-key mx-key-${b.key}${value === b.key ? ' is-on' : ''}`} aria-pressed={value === b.key} onClick={() => onChange(value === b.key ? '' : b.key)}>
            <span className="mx-key-n"><span className={`mx-key-dot mx-dot-${b.key}`} aria-hidden="true" />{fmtInt(counts[b.key] || 0)}</span>
            <span className="mx-key-l">{b.label}</span>
            <span className="mx-key-note">{b.note}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
