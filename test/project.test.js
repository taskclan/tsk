import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeProject, readProject, clearProject, projectConfigPath } from '../src/project.js';
import { pickApp } from '../src/api.js';

describe('project link', () => {
  it('writes and clears .taskclan/config.json', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'tsk-'));
    try {
      writeProject({ app: 'demo', appId: 'abc' }, cwd);
      assert.equal(readProject(cwd).app, 'demo');
      assert.ok(projectConfigPath(cwd).endsWith('.taskclan/config.json'));
      clearProject(cwd);
      assert.equal(readProject(cwd), null);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe('pickApp', () => {
  const list = [
    { id: '1', name: 'prod', pipeline: 'shop', stage: 'production' },
    { id: '2', name: 'stage', pipeline: 'shop', stage: 'staging' },
  ];

  it('resolves by name', () => {
    assert.equal(pickApp(list, 'stage').id, '2');
  });

  it('uses the only app when name omitted', () => {
    assert.equal(pickApp([list[0]], null).name, 'prod');
  });

  it('refuses ambiguity', () => {
    assert.throws(() => pickApp(list, null), /more than one app/);
  });
});
