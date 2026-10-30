import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, leadingIntent } from '../src/args.js';

test('rollback is a real command name, not help', () => {
  assert.equal(leadingIntent('rollback'), null);
});

test('rollback accepts an id positional and --app', () => {
  const a = parseArgs(['a1b2c3d4', '--app', 'demo']);
  assert.equal(a._[0], 'a1b2c3d4');
  assert.equal(a.app, 'demo');
});

test('rollback --to works as an alias for the target', () => {
  const a = parseArgs(['--to', 'deadbeef', '-a', 'demo']);
  assert.equal(a.to, 'deadbeef');
  assert.equal(a.app, 'demo');
});
