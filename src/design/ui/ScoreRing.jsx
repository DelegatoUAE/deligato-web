import { useId } from 'react';
import cx from './cx.js';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import { READINESS_BANDS } from './bands.js';

const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

/* ---- Readiness: half-circle dial on navy ------------------------- */
function ReadinessDial({ value, band, bandTone, label, caption, size, showBands, bare, className }) {
  const gid = useId().replace(/:/g, '');
  const known = value !== null && value !== undefined && value !== '';
  const v = clamp(value);
  const cx0 = 120, cy0 = 122, r = 100;
  const arcLen = Math.PI * r;
  const arcPath = `M ${cx0 - r} ${cy0} A ${r} ${r} 0 0 1 ${cx0 + r} ${cy0}`;
  const angle = Math.PI * (1 - v / 100);
  const nx = cx0 + r * Math.cos(angle);
  const ny = cy0 - r * Math.sin(angle);
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI * (1 - i / 20);
    const major = i % 10 === 0;
    const r1 = r + 12, r2 = r + (major ? 22 : 17);
    return { x1: cx0 + r1 * Math.cos(a), y1: cy0 - r1 * Math.sin(a), x2: cx0 + r2 * Math.cos(a), y2: cy0 - r2 * Math.sin(a), major, i };
  });
  const tone = bandTone || READINESS_BANDS.find((b) => b.label === band)?.tone;
  const bandIndex = READINESS_BANDS.findIndex((b) => b.tone === tone);

  return (
    <div
      className={cx('ui-dial', 'ui-on-navy', size === 'sm' && 'ui-dial-sm', bare && 'is-bare', tone && `ui-band-${tone}`, className)}
      role="group"
      aria-label={`${label}: ${known ? `${Math.round(v)} out of 100` : 'not scored yet'}${band ? `, ${band}` : ''}`}
    >
      <div className="ui-dial-label" aria-hidden="true">{label}</div>
      <div className="ui-dial-gauge" aria-hidden="true">
        <svg viewBox="0 0 240 140">
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--gold-dark)" />
              <stop offset="100%" stopColor="var(--gold-400)" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <line key={t.i} className={cx('ui-dial-tick', t.major && 'is-major')} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth={t.major ? 2 : 1.25} strokeLinecap="round" />
          ))}
          <path className="ui-dial-track" d={arcPath} fill="none" strokeWidth="14" strokeLinecap="round" />
          {known && (
            <path
              d={arcPath}
              fill="none"
              stroke={`url(#g${gid})`}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={arcLen}
              strokeDashoffset={arcLen * (1 - v / 100)}
              style={{ transition: 'stroke-dashoffset var(--t-instrument) var(--ease-out)' }}
            />
          )}
          {known && <circle className="ui-dial-needle" cx={nx} cy={ny} r="9" />}
        </svg>
        <div className="ui-dial-value">
          <strong>{known ? Math.round(v) : '?'}</strong>
          <span>/100</span>
        </div>
      </div>
      {band && <div className="ui-dial-band">{band}</div>}
      {caption && <p className="ui-dial-caption">{caption}</p>}
      {showBands && (
        <div className="ui-dial-scale-strip" aria-hidden="true">
          <div className="ui-bandstrip">
            {READINESS_BANDS.map((b, i) => (
              <i key={b.tone} className={cx(`ui-band-${b.tone}`, i === bandIndex && 'is-current')} />
            ))}
          </div>
          <div className="ui-bandstrip-labels"><span>Not yet fundable</span><span>Investor-ready</span></div>
        </div>
      )}
    </div>
  );
}

/* ---- Capital Match: segmented ring on a light surface ------------ */
function MatchRing({ value, label, confidence, size, showConfidence, caption, className }) {
  const known = value !== null && value !== undefined && value !== '';
  const v = clamp(value);
  const px = size === 'sm' ? 64 : size === 'lg' ? 152 : 116;
  const segs = size === 'sm' ? 20 : size === 'lg' ? 36 : 30;
  const stroke = size === 'sm' ? 5 : size === 'lg' ? 10 : 8;
  const c = px / 2;
  const r = c - stroke / 2 - 4;
  const on = known ? Math.round((v / 100) * segs) : 0;
  const gap = 360 / segs;
  const sweep = gap * 0.55;
  const seg = (i) => {
    const a0 = ((-90 + i * gap) * Math.PI) / 180;
    const a1 = ((-90 + i * gap + sweep) * Math.PI) / 180;
    return `M ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };
  const fs = size === 'sm' ? 'var(--text-lg)' : size === 'lg' ? 'var(--text-5xl)' : 'var(--text-3xl)';

  return (
    <div
      className={cx('ui-match', confidence && `is-${confidence}`, !known && 'is-empty', className)}
      role="group"
      aria-label={`${label}: ${known ? `${Math.round(v)} out of 100` : 'not enough data to score'}${confidence ? `, ${confidence} confidence` : ''}`}
    >
      <div className="ui-match-ring" style={{ width: px, height: px, '--match-fs': fs }}>
        <svg viewBox={`0 0 ${px} ${px}`} aria-hidden="true">
          <circle className="ui-match-halo" cx={c} cy={c} r={c - 1} strokeWidth="1" />
          {Array.from({ length: segs }, (_, i) => (
            <path
              key={i}
              d={seg(i)}
              fill="none"
              strokeWidth={stroke}
              className={cx('ui-match-seg', i < on && 'is-on', i === on - 1 && 'is-tip')}
            />
          ))}
        </svg>
        <div className="ui-match-value" aria-hidden="true">
          <strong>{known ? Math.round(v) : '?'}</strong>
          {size !== 'sm' && <span>{known ? 'of 100' : 'no score'}</span>}
        </div>
      </div>
      {size !== 'sm' && label && <div className="ui-match-label" aria-hidden="true">{label}</div>}
      {showConfidence && confidence && <ConfidenceBadge level={confidence} size="sm" />}
      {caption && <div className="ui-faint" style={{ fontSize: 'var(--text-xs)', textAlign: 'center', maxWidth: '22ch' }}>{caption}</div>}
    </div>
  );
}

/**
 * ScoreRing: the two score instruments. They are deliberately different
 * so the Readiness score and the Capital Match Score are never confused.
 *
 * variant="readiness": half-circle dial on navy, gold arc, band chip and
 *   optional seven-band strip (showBands). Props: value, band (label from
 *   the readiness engine), bandTone (critical | very-high | high | medium |
 *   semi | ready | exceptional), caption, size ('md' | 'sm'), bare.
 * variant="match": segmented navy ring on a light surface with a gold tip.
 *   Props: value, confidence (high | medium | low; low fades the segments
 *   and dashes the halo), size ('sm' | 'md' | 'lg'), showConfidence.
 * value null/undefined renders an unscored state, never zero.
 */
export default function ScoreRing({
  variant = 'readiness',
  value,
  label,
  band,
  bandTone,
  confidence,
  caption,
  size = 'md',
  showBands = false,
  showConfidence = true,
  bare = false,
  className,
}) {
  if (variant === 'match') {
    return (
      <MatchRing
        value={value}
        label={label ?? 'Capital Match'}
        confidence={confidence}
        size={size}
        caption={caption}
        showConfidence={showConfidence}
        className={className}
      />
    );
  }
  return (
    <ReadinessDial
      value={value}
      label={label ?? 'Capital Readiness'}
      band={band}
      bandTone={bandTone}
      caption={caption}
      size={size}
      showBands={showBands}
      bare={bare}
      className={className}
    />
  );
}
