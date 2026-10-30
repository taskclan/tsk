import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { destroyConfirm } from '../src/commands/apps.js';
import { parseArgs } from '../src/args.js';
import { writeProject, readProject, clearProject } from '../src/project.js';

test('destroyConfirm requires --confirm with the exact name', () => {
  assert.throws(() => destroyConfirm('demo', {}), /--confirm demo/);
  assert.throws(() => destroyConfirm('demo', { yes: true }), /--confirm demo/);
  assert.throws(() => destroyConfirm('demo', { confirm: true }), /--confirm demo/);
  assert.throws(() => destroyConfirm('demo', { confirm: 'other' }), /exactly/);
  assert.doesNotThrow(() => destroyConfirm('demo', { confirm: 'demo' }));
});

test('parseArgs keeps --confirm NAME as a string value', () => {
  const a = parseArgs(['my-app', '--confirm', 'my-app']);
  assert.equal(a._[0], 'my-app');
  assert.equal(a.confirm, 'my-app');
  // Flag-only --confirm must not pass destroyConfirm.
  const bare = parseArgs(['my-app', '--confirm']);
  assert.equal(bare.confirm, true);
});

test('apps:info and apps:destroy are real command names', async () => {
  const { parseArgs: pa, leadingIntent } = await import('../src/args.js');
  assert.equal(leadingIntent('apps:info'), null);
  assert.equal(leadingIntent('apps:destroy'), null);
  const info = pa(['--app', 'x']);
  assert.equal(info.app, 'x');
});

test('clearing a link that pointed at the destroyed app', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'tsk-destroy-'));
  try {
    writeProject({ app: 'demo', appId: 'abc' }, cwd);
    assert.equal(readProject(cwd).app, 'demo');
    // Mimic appsDestroy's clear condition.
    const linked = readProject(cwd);
    const app = { name: 'demo', id: 'abc' };
    if (linked && (linked.app === app.name || linked.appId === app.id)) {
      clearProject(cwd);
    }
    assert.equal(readProject(cwd), null);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
