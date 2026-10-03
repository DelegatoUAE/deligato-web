/* ProgressRing: the simple percentage ring from the v0 kit, kept so code
   written against components/ui keeps working. For scores, use ScoreRing. */
export default function ProgressRing({ value = 0, size = 92, stroke = 8, tone = 'brand', caption }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ui-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(v)}%`}>
        <circle className="ui-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={`ui-ring-fill ui-ring-${tone}`}
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ui-ring-label">
        <strong>{Math.round(v)}</strong>
        {caption && <span>{caption}</span>}
      </div>
    </div>
  );
}
