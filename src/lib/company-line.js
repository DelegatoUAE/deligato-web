import { fmtUsd, countryName } from './format.js';

/** The company and raise the matches were run for, as one plain sentence. Unknowns stay visible. */
export function companyLine(company = {}) {
  const where = countryName(company.hq_country_iso2) || 'HQ not set';
  const who = [company.stage || 'stage not set', company.sector || 'sector not set', where].join(', ');
  const raise = fmtUsd(company.raise_usd);
  const how = company.instrument ? ` as ${company.instrument}` : ', instrument not set';
  return `${company.name || 'Your company'}: ${who}. ${raise ? `Raising ${raise}${how}` : `Raise amount not set${company.instrument ? `, ${company.instrument}` : ''}`}.`;
}
