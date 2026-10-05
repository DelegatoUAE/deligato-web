// Use-of-funds purposes for Capital need (D46). The KEYS come from the API
// (GET /api/v1/routing/catalog → purposes, R-B5); the web keeps only the words.
import { humanise } from './format.js';

const LABEL = {
  working_capital: 'Working capital', product: 'Product and engineering', hiring: 'Hiring',
  marketing: 'Sales and marketing', expansion: 'Expansion to new markets', capex: 'Equipment or facilities',
  rnd: 'R&D, pilots, certification', refinancing: 'Refinancing debt', acquisition: 'An acquisition',
};
// Order founders read best; any key the API adds later is appended with a plain label.
const ORDER = ['working_capital', 'product', 'hiring', 'marketing', 'expansion', 'capex', 'rnd', 'refinancing', 'acquisition'];

/** [{ key, label }] for the API's keys; the known list when the catalog can't be read. */
export function purposeOptions(apiKeys) {
  const keys = Array.isArray(apiKeys) && apiKeys.length ? apiKeys : ORDER;
  const known = ORDER.filter((k) => keys.includes(k));
  const extra = keys.filter((k) => !ORDER.includes(k));
  return [...known, ...extra].map((key) => ({ key, label: LABEL[key] || humanise(key) }));
}
