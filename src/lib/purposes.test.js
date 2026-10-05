import test from 'node:test';
import assert from 'node:assert/strict';
import { purposeOptions } from './purposes.js';

test('purpose keys come from the API catalog; labels are the web words (R-B5)', () => {
  assert.deepEqual(purposeOptions(['capex', 'working_capital']).map((o) => o.key), ['working_capital', 'capex']);
  assert.equal(purposeOptions(['new_thing']).at(-1).label, 'New thing');
  assert.equal(purposeOptions(null).length, 9);
  assert.ok(!purposeOptions(['hiring']).some((o) => o.key === 'capex'), 'a key the API dropped is not offered');
});
