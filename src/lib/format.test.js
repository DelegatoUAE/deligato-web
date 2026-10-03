import test from 'node:test';
import assert from 'node:assert/strict';
import { countryName, wordsForCodes } from './format.js';

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
