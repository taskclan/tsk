import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs } from '../src/args.js';

test('reads --app x and --app=x the same way', () => {
  assert.equal(parseArgs(['--app', 'orbit']).app, 'orbit');
  assert.equal(parseArgs(['--app=orbit']).app, 'orbit');
});

test('-a is --app', () => {
  assert.equal(parseArgs(['-a', 'orbit']).app, 'orbit');
});

test('a flag followed by another flag is a boolean', () => {
  // `--tail --app x` must not read as tail="--app", which would swallow the
  // app name and tail nothing.
  const a = parseArgs(['--tail', '--app', 'orbit']);
  assert.equal(a.tail, true);
  assert.equal(a.app, 'orbit');
});

test('a trailing flag is a boolean, not a crash', () => {
  assert.equal(parseArgs(['--tail']).tail, true);
});

test('positionals are kept in order', () => {
  assert.deepEqual(parseArgs(['web=3', 'worker=1'])._, ['web=3', 'worker=1']);
});

test('everything after -- is positional even if it looks like a flag', () => {
  assert.deepEqual(parseArgs(['--', '--not-a-flag'])._, ['--not-a-flag']);
});

test('a value containing = survives', () => {
  assert.equal(parseArgs(['--filter=a=b']).filter, 'a=b');
});
