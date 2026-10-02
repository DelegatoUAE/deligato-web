/** ProgressBar: a thin determinate bar. tone: brand | gold | ok | warn | bad. */
export default function ProgressBar({ value = 0, max = 100, tone = 'brand', label, showValue = true, valueText }) {
  const v = Math.max(0, Math.min(max, Number(value) || 0));
  const pct = max ? (v / max) * 100 : 0;
  return (
    <div className="ui-progress-wrap">
      {(label || showValue) && (
        <div className="ui-progress-head">
          {label && <span>{label}</span>}
          {showValue && <strong>{valueText || `${Math.round(pct)}%`}</strong>}
        </div>
      )}
      <div
        className="ui-progress"
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
        aria-label={label || 'Progress'}
      >
        <div className={`ui-progress-fill ui-progress-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
