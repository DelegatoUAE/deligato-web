// Data room stored files (U-1): pure helpers for the page. The API is the
// authority on every limit (it re-checks type, content and size); these only
// spare the founder a doomed upload and format what the API returns.

export const DEFAULT_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'png', 'jpg'];
const LABELS = { pdf: 'PDF', docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint', csv: 'CSV', png: 'PNG', jpg: 'JPG', jpeg: 'JPG' };
const DAY = 86400000;

export const extOf = (name) => (/\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')) || [])[1]?.toLowerCase() || '';

/** The <input accept> list for the extensions the API allows. */
export function acceptFor(exts = DEFAULT_EXTENSIONS) {
  const list = exts.includes('jpg') && !exts.includes('jpeg') ? [...exts, 'jpeg'] : exts;
  return list.map((e) => `.${e}`).join(',');
}

/** 'PDF, Word, Excel, PowerPoint, CSV, PNG or JPG' */
export function typesSentence(exts = DEFAULT_EXTENSIONS) {
  const names = [...new Set(exts.map((e) => LABELS[e] || e.toUpperCase()))];
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0] || '';
}

export function fmtBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${Math.round(v / 1024)} KB`;
  if (v < 1024 ** 3) return `${(v / (1024 * 1024)).toFixed(v < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(v / 1024 ** 3).toFixed(1)} GB`;
}

/** Type label for a stored document: from the file name, else the MIME type. */
export function typeLabel(doc) {
  const e = extOf(doc?.file_name);
  if (LABELS[e]) return LABELS[e];
  const m = String(doc?.mime_type || '');
  if (m === 'application/pdf') return 'PDF';
  if (m.startsWith('image/')) return m.slice(6).toUpperCase();
  return m ? 'File' : '';
}

/** Null when the file can go up; otherwise the sentence to show. */
export function checkFile(file, { exts = DEFAULT_EXTENSIONS, maxBytes = 25 * 1024 * 1024 } = {}) {
  if (!file) return 'Choose a file.';
  const e = extOf(file.name);
  const ok = exts.includes(e) || (e === 'jpeg' && exts.includes('jpg'));
  if (!ok) return `That file type isn't supported. Use ${typesSentence(exts)}.`;
  if (!file.size) return 'That file is empty.';
  if (file.size > maxBytes) return `Files must be ${fmtBytes(maxBytes)} or smaller.`;
  return null;
}

/** Opened in the browser (inline) rather than downloaded. */
export const viewsInline = (doc) => /^(application\/pdf|image\/(png|jpeg))$/.test(String(doc?.mime_type || ''));

/** expired | expiring (within 30 days) | valid | null (no expiry date). Display only. */
export function expiryState(expiresAt, now = Date.now()) {
  if (!expiresAt) return null;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.ceil((t - now) / DAY);
  return days <= 0 ? { state: 'expired', days } : days <= 30 ? { state: 'expiring', days } : { state: 'valid', days };
}

/** "3.2 MB of 10 GB used" (the quota comes from the API's plan limits, never from copy). */
export function usageLine(files) {
  if (!files || typeof files.quota_bytes !== 'number' || files.quota_bytes <= 0) return null;
  return `${fmtBytes(files.used_bytes || 0)} of ${fmtBytes(files.quota_bytes)} used`;
}

/** The item holds a stored file (even an expired one, which the API counts as missing). */
export const hasStoredFile = (item) => (item?.documents || []).some((d) => d.stored);

/**
 * Which "not done yet" actions an item offers. An item that is not done
 * because its stored file EXPIRED is renewed through that file (Replace or
 * Details), not by adding a second file, "I have this" or N/A (the API refuses
 * N/A or "I have this" while a document is attached).
 */
export const showsMissingActions = (item) => !item?.done && !hasStoredFile(item);
