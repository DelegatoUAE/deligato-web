import test from 'node:test';
import assert from 'node:assert/strict';
import { countryName, wordsForCodes, plainIntel } from './format.js';

test('country codes and region enums become words', () => {
  assert.equal(countryName('AE'), 'United Arab Emirates');
  assert.equal(countryName('NORTH_AMERICA'), 'North America');
  assert.equal(countryName(null), null);
  assert.equal(countryName('Somewhere'), 'Somewhere');
});

test('mandate enums inside server sentences are rendered as words', () => {
  assert.equal(wordsForCodes('has a GLOBAL/MENA/NORTH_AMERICA mandate'), 'has a Global, MENA and North America mandate');
  assert.equal(wordsForCodes('both cover GLOBAL/NORTH_AMERICA'), 'both cover Global and North America');
  assert.equal(wordsForCodes('backs SAFE and VC rounds'), 'backs SAFE and VC rounds');
  assert.equal(wordsForCodes('cover NORTH_AMERICA only'), 'cover North America only');
});

test('market input accepts names, codes and regions, and refuses anything else', async () => {
  const { marketCode, countryOptions, COUNTRY_CODES } = await import('./countries.js');
  const blocs = ['GLOBAL', 'GCC', 'NORTH_AMERICA'];
  assert.equal(marketCode('Saudi Arabia', blocs), 'SA');
  assert.equal(marketCode('sa', blocs), 'SA');
  assert.equal(marketCode('North America', blocs), 'NORTH_AMERICA');
  assert.equal(marketCode('gcc', blocs), 'GCC');
  assert.equal(marketCode('Atlantis', blocs), null);
  assert.ok(COUNTRY_CODES.length > 100);
  assert.equal(countryOptions().length, COUNTRY_CODES.length);
});

test('AI text loses echoed evidence ids and shouts', async () => {
  const { stripEvidenceIds } = await import('./format.js');
  assert.equal(stripEvidenceIds('Stage fits (evidence_id: ev_stage).'), 'Stage fits.');
  assert.equal(wordsForCodes('they list GLOBAL, MENA, North America'), 'they list Global, MENA, North America');
});

test('engine sentences show dates, periods and timing as words (D57)', () => {
  assert.equal(plainIntel('On 2026-10-23.'), 'On 23 Oct 2026.');
  assert.equal(plainIntel('Figures for 2026-09 added'), 'Figures for Sep 2026 added');
  assert.equal(plainIntel('Target funding date: 2027-07-30 → 2027-06-30'), 'Target funding date: 30 Jul 2027 → 30 Jun 2027');
  assert.equal(plainIntel('Raise timing: not set → 3_6m'), 'Raise timing: not set → 3–6 months');
  assert.equal(plainIntel('Raise timing: 0_3m → now'), 'Raise timing: 0–3 months → actively raising now');
  assert.equal(plainIntel('Based on answers from 2026-10-03T14:00:51.346Z'), 'Based on answers from 3 Oct 2026');
  assert.equal(plainIntel('Runway is 11.4 months, $1.5M raise'), 'Runway is 11.4 months, $1.5M raise');
  assert.equal(plainIntel(null), null);
});

test('founder-typed revenue, burn and runway carry the "You told us" label (R-F1)', async () => {
  const { DECLARED_LABEL, isDeclaredFigure } = await import('./format.js');
  assert.equal(DECLARED_LABEL, 'You told us');
  for (const f of ['revenue_usd', 'burn_usd', 'runway_months']) assert.equal(isDeclaredFigure(f), true);
  assert.equal(isDeclaredFigure('stage'), false);
});

test('exclusion reasons read country names and the right article', async () => {
  const { plainExclusion } = await import('./format.js');
  assert.equal(plainExclusion('No AE mandate — invests in GB'), 'No mandate for United Arab Emirates — invests in United Kingdom');
  assert.equal(plainExclusion('Is a Incubator; you asked for VC'), 'Is an Incubator; you asked for VC');
  assert.equal(plainExclusion('Invests at Growth, not Seed'), 'Invests at Growth, not Seed');
});

test('capital-need changes are titled by the field name founders know', async () => {
  const { changeTitle } = await import('./format.js');
  assert.equal(changeTitle({ type: 'capital_need', title: 'Raise usd: not set → $1.5M', cite: { field: 'raise_usd' } }), 'Raise amount: not set → $1.5M');
  assert.equal(changeTitle({ type: 'pipeline', title: 'X moved to contacted', cite: { field: 'stage' } }), 'X moved to contacted');
});

test('SMEs read "your business", everyone else "your company" (positioning §2.9)', async () => {
  const { companyWord } = await import('./format.js');
  assert.equal(companyWord({ company_kind: 'sme' }), 'business');
  assert.equal(companyWord({ company_kind: 'startup' }), 'company');
  assert.equal(companyWord({}), 'company');
  assert.equal(companyWord(null), 'company');
});
