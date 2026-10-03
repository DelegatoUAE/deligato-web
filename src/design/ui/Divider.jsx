/** Divider: a hairline, optionally with a centred label. */
export default function Divider({ label }) {
  return label
    ? <div className="ui-divider has-label" role="separator"><span>{label}</span></div>
    : <hr className="ui-divider" />;
}
