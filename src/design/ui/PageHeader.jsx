/**
 * PageHeader: the top of every screen.
 * breadcrumbs: [{ label, href? }] (last one is the current page).
 * eyebrow: short context above the title (sentence case).
 * meta: a row of Badges/Tags under the subtitle. actions: buttons, right side.
 */
export default function PageHeader({ breadcrumbs, eyebrow, title, subtitle, meta, actions }) {
  return (
    <header className="ui-page-head">
      <div className="ui-page-head-main">
        {breadcrumbs?.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="ui-crumbs">
              {breadcrumbs.map((b, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <li key={b.label}>
                    {last || !b.href ? <span aria-current={last ? 'page' : undefined}>{b.label}</span> : <a href={b.href}>{b.label}</a>}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {eyebrow && <div className="ui-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="ui-page-sub">{subtitle}</p>}
        {meta && <div className="ui-page-meta">{meta}</div>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}
