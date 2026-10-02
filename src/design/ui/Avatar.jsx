import cx from './cx.js';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] || '';
  return (first + last).toUpperCase();
}

function toneFor(name = '') {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 5;
}

/**
 * Avatar: a person (circle) or an organisation (shape="org", rounded square).
 * Initials are derived from name; tone is stable per name. size in px.
 * ring adds the gold "this is you / primary contact" ring.
 */
export default function Avatar({ name, src, size = 36, shape = 'person', ring = false, className, title }) {
  return (
    <span
      className={cx('ui-avatar', `ui-avatar-t${toneFor(name)}`, shape === 'org' && 'ui-avatar-org', ring && 'ui-avatar-ring', className)}
      style={{ '--av': `${size}px` }}
      title={title || name}
      role="img"
      aria-label={name}
    >
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}
