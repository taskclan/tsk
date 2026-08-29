import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs, leadingIntent } from '../src/args.js';

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

test('a leading --help is a request, not a command name', () => {
  // `tsk deploy --help` worked; `tsk --help` answered `no command "--help"`,
  // which is the form people type first. parseArgs never saw it, because the
  // CLI takes argv[0] as the command and parses only the rest.
  assert.equal(leadingIntent('--help'), 'help');
  assert.equal(leadingIntent('-h'), 'help');
  assert.equal(leadingIntent('help'), 'help');
});

test('bare tsk shows help rather than an error', () => {
  assert.equal(leadingIntent(undefined), 'help');
  assert.equal(leadingIntent(''), 'help');
});

test('every spelling of version agrees', () => {
  // --version was special-cased by name and worked; -v and -V were not.
  for (const f of ['version', '--version', '-v', '-V']) {
    assert.equal(leadingIntent(f), 'version', f);
  }
});

test('a real command is left alone', () => {
  for (const c of ['deploy', 'logs', 'ps:scale', 'releases:rollback']) {
    assert.equal(leadingIntent(c), null, c);
  }
});

test('does not mistake a lookalike for a flag', () => {
  // A command called "helper" is not a request for help.
  assert.equal(leadingIntent('helper'), null);
  assert.equal(leadingIntent('--helpful'), null);
});
