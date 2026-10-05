// Outreach "To:" (UAT #10). The investor data holds no named contacts or email
// addresses, so the composer says honestly how to reach each investor: the best
// route on record (application page, website, route type), never an invented
// address. PURE (node:test).

const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\/[^\s]+$/i.test(u.trim()) ? u.trim() : null);

/**
 * { line, href, linkLabel }: one sentence for the composer, plus at most one link.
 * investor: { name, contact_route, application_url, website }
 */
export function reachFor(investor = {}) {
  const name = investor.name || 'this investor';
  const route = investor.contact_route && investor.contact_route !== 'Unknown' ? investor.contact_route : null;
  const app = safeUrl(investor.application_url);
  const site = safeUrl(investor.website);
  if (route === 'Invitation only') return { line: `${name} reviews invited companies only. Track them in your pipeline rather than writing now.`, href: site, linkLabel: site ? 'Their website' : null };
  if (route === 'Warm intro only') return { line: `${name} takes introductions only. Send this to someone who knows them and ask them to pass it on.`, href: site, linkLabel: site ? 'Their website' : null };
  if (app && (route === 'Online application' || route === 'Platform' || !route)) {
    return { line: `${name} takes pitches through ${route === 'Platform' ? 'a platform' : 'an application page'}. Use this draft for your answers there.`, href: app, linkLabel: 'Open their application page' };
  }
  if (route === 'Pitch email') return { line: `${name} takes pitches by email, but no address is on record. Their website usually lists it.`, href: site, linkLabel: site ? 'Their website' : null };
  if (route) return { line: `${name} takes contact by: ${route}.`, href: app || site, linkLabel: app ? 'Open their application page' : site ? 'Their website' : null };
  return { line: `How ${name} takes pitches is not on record. Check their website before sending.`, href: site, linkLabel: site ? 'Their website' : null };
}

/** The mailto: has no recipient because no address is on record; say so next to the button. */
export const NO_ADDRESS_NOTE = 'No email address is on record, so your email app opens without a recipient. Add it there.';
