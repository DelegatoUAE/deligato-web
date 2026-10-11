// The D73 plan ladder as the public catalog describes it (GET /api/v1/packages/catalog), loaded
// once per page load. Upgrade lines read the next plan's name and limits from here, so no screen
// types a plan's number ("50 ranked matches") itself.
import { getCatalog } from './packages';
import useApi from './useApi';

let cache = null;
export const loadCatalog = () => {
  cache = cache || getCatalog().catch((e) => { cache = null; throw e; });
  return cache;
};

/** { id, name, tagline, display } of one catalog plan, or null. PURE. */
export function ladderPlan(catalog, id) {
  const p = [...(catalog?.packages || []), ...(catalog?.add_ons || [])].find((x) => x.id === id);
  return p ? { id: p.id, name: p.name, tagline: p.tagline, display: p.display || {}, entitlements: p.entitlements || {} } : null;
}

/** The catalog (undefined while loading, null when it can't load: callers then say less, never guess). */
export function useLadder() {
  const q = useApi(() => loadCatalog().catch(() => null), []);
  return q.data;
}
