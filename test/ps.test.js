import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseScale } from '../src/commands/ps.js';

test('reads web=3', () => {
  assert.deepEqual(parseScale(['web=3']), { web: 3 });
});

test('rejects something that is not a scale pair, naming the shape', () => {
  assert.throws(() => parseScale(['web']), /expected something like web=3/);
});

test('rejects a non-numeric quantity rather than sending NaN to the API', () => {
  assert.throws(() => parseScale(['web=lots']), /expected something like web=3/);
});

test('says which process cannot scale instead of letting the API 400', () => {
  // The platform scales the web container only. Failing here names the process
  // the user typed; failing at the API says "bad request".
  assert.throws(() => parseScale(['worker=2']), /only the web process can scale here, not worker/);
});

test('refuses an empty scale', () => {
  assert.throws(() => parseScale([]), /nothing to scale/);
});
