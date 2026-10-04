import { useEffect, useState } from 'react';
import cx from './cx.js';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import Button from './Button.jsx';

/**
 * AppShell: navy sidebar + sticky top bar + content column.
 * Below 1024px the sidebar becomes an off-canvas drawer behind a menu button.
 *
 * nav: [{ title?, items: [{ id, label, icon?, href?, active?, badge?, onClick? }] }]
 * LinkComponent: what renders links. Default 'a' (uses href). With
 *   react-router pass NavLink: it receives `to`, and NavLink's own
 *   aria-current="page" lights the active item, so `active` is optional.
 * brand: node for the top-left (default: wordmark + product name).
 * user: { name, sub } shown at the bottom; footer: extra node there.
 * title: text in the top bar; topActions: buttons on the right of it.
 */
export default function AppShell({
  nav = [],
  LinkComponent = 'a',
  brand,
  productName = 'Capital Intelligence',
  wordmark = 'Deligato',
  user,
  footer,
  title,
  topActions,
  children,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.querySelector('#ui-shell-nav .ui-navitem')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  function renderItem(it) {
    const content = (
      <>
        {it.icon && <Icon name={it.icon} />}
        <span>{it.label}</span>
        {it.badge != null && <span className="ui-navitem-badge">{it.badge}</span>}
      </>
    );
    const cls = cx('ui-navitem', it.active && 'is-active');
    const onClick = () => { it.onClick?.(); close(); };
    if (!it.href) {
      return <button type="button" className={cls} onClick={onClick} aria-current={it.active ? 'page' : undefined}>{content}</button>;
    }
    if (LinkComponent === 'a') {
      return <a className={cls} href={it.href} onClick={onClick} aria-current={it.active ? 'page' : undefined}>{content}</a>;
    }
    return (
      <LinkComponent
        to={it.href}
        end={it.end}
        onClick={onClick}
        className={({ isActive } = {}) => cx('ui-navitem', (it.active || isActive) && 'is-active')}
      >
        {content}
      </LinkComponent>
    );
  }

  return (
    <div className={cx('ui-shell', open && 'is-nav-open')}>
      <div className="ui-shell-scrim" onClick={close} aria-hidden="true" />
      <aside className="ui-shell-side ui-on-navy" id="ui-shell-nav" aria-label="Main">
        {brand || (
          <div className="ui-shell-brand">
            <div>
              <div className="ui-wordmark">{wordmark}</div>
              <span className="ui-wordmark-sub">{productName}</span>
            </div>
          </div>
        )}
        <nav className="ui-shell-nav">
          {nav.map((section, si) => (
            <div className="ui-shell-section" key={section.title || si}>
              {section.title && <div className="ui-shell-section-title">{section.title}</div>}
              {section.items.map((it) => <div key={it.id || it.label}>{renderItem(it)}</div>)}
            </div>
          ))}
        </nav>
        {(user || footer) && (
          <div className="ui-shell-foot">
            {user && (
              <div className="ui-shell-user">
                <Avatar name={user.name} size={34} />
                <div className="ui-who-text">
                  <span className="ui-who-name">{user.name}</span>
                  {user.sub && <span className="ui-who-sub">{user.sub}</span>}
                </div>
              </div>
            )}
            {footer}
          </div>
        )}
      </aside>
      <div className="ui-shell-main">
        <header className="ui-shell-top">
          <Button
            variant="ghost"
            iconOnly
            className="ui-shell-burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="ui-shell-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="menu" />
          </Button>
          {title && <div className="ui-shell-top-title">{title}</div>}
          {topActions && <div className="ui-shell-top-actions">{topActions}</div>}
        </header>
        <main className="ui-shell-content" id="main">{children}</main>
      </div>
    </div>
  );
}
