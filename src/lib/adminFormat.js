// Formatting for the Admin oversight screens. Pure, so it is tested with the
// project's node:test runner. A missing value always reads '—', never 0.

export const fmtUsd = (n) => (n == null ? '—' : n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1e3 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);

export const ago = (iso) => {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (Number.isNaN(d)) return '—';
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`;
};

export const day = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const words = (s) => (s ? String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '—');
