import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/args.js';
import { appUrl } from '../src/commands/apps.js';

test('domains:add parses the hostname as a positional', () => {
  const a = parseArgs(['app.example.com', '--app', 'demo']);
  assert.equal(a._[0], 'app.example.com');
  assert.equal(a.app, 'demo');
});

test('open prefers custom domain for the live URL', () => {
  assert.equal(
    appUrl({ customDomain: 'app.example.com', liveUrl: 'https://x.taskclan.app' }),
    'https://app.example.com',
  );
});
