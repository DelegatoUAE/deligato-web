// I-09: every country the matcher understands (the ISO2 members of the
// region blocs in api/capital/vocab.js: 182 codes, extracted 3 Oct 2026).
// Names come from the browser (Intl.DisplayNames), so nothing is hand-typed.
import { countryName } from './format.js';

export const COUNTRY_CODES = ["AD","AE","AF","AL","AM","AO","AR","AT","AU","AZ","BA","BD","BE","BF","BG","BH","BI","BJ","BN","BO","BR","BT","BW","BY","CA","CD","CF","CG","CH","CI","CL","CM","CN","CO","CR","CU","CV","CY","CZ","DE","DJ","DK","DO","DZ","EC","EE","EG","ER","ES","ET","FI","FJ","FR","GA","GB","GE","GH","GM","GN","GQ","GR","GT","GW","HK","HN","HR","HU","ID","IE","IL","IN","IQ","IR","IS","IT","JM","JO","JP","KE","KG","KH","KM","KR","KW","KZ","LA","LB","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MG","MK","ML","MM","MN","MO","MR","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NG","NI","NL","NO","NP","NZ","OM","PA","PE","PG","PH","PK","PL","PR","PS","PT","PY","QA","RO","RS","RW","SA","SB","SC","SD","SE","SG","SI","SK","SL","SM","SN","SO","SS","ST","SV","SY","SZ","TD","TG","TH","TJ","TL","TM","TN","TO","TR","TT","TW","TZ","UA","UG","US","UY","UZ","VA","VC","VE","VN","VU","WS","XK","YE","ZA","ZM","ZW"];

/** [{ value: 'AE', label: 'United Arab Emirates' }, ...] sorted by name. */
export function countryOptions() {
  return COUNTRY_CODES.map((c) => ({ value: c, label: countryName(c) })).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Turn what a founder typed into a market code: a country name ("Saudi
 * Arabia"), an ISO2 code ("SA"), a region name ("North America") or a region
 * code ("GCC"). Returns null when it is none of those.
 */
export function marketCode(input, blocs = []) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const up = raw.toUpperCase().replace(/\s+/g, '_');
  if (blocs.includes(up)) return up;
  const byBlocName = blocs.find((b) => countryName(b).toLowerCase() === raw.toLowerCase());
  if (byBlocName) return byBlocName;
  if (/^[A-Z]{2}$/.test(up) && COUNTRY_CODES.includes(up)) return up;
  const byName = COUNTRY_CODES.find((c) => countryName(c).toLowerCase() === raw.toLowerCase());
  return byName || null;
}
