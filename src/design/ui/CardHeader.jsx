/** CardHeader: header row for a Card built by hand (Card's title prop does the same). */
export default function CardHeader({ title, subtitle, action, eyebrow, as: As = 'h2' }) {
  return (
    <div className="ui-card-head">
      <div>
        {eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}
        <As className="ui-card-title">{title}</As>
        {subtitle && <p className="ui-card-sub">{subtitle}</p>}
      </div>
      {action && <div className="ui-card-action">{action}</div>}
    </div>
  );
}
