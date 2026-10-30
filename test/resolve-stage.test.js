import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// resolveApp hits the network via listApps — test the stage sibling logic by
// exercising a local replica of the stage filter (same rules as api.js).
function resolveStage(list, app, stage) {
  if (!app.pipeline) throw new Error('not in a pipeline');
  const want = String(stage).trim().toLowerCase();
  const sibling = list.find((s) => s.pipeline === app.pipeline && String(s.stage || '').toLowerCase() === want);
  if (!sibling) throw new Error(`no app at stage ${want}`);
  return sibling;
}

describe('pipeline stage resolution', () => {
  const list = [
    { id: '1', name: 'shop', pipeline: 'shop', stage: 'production' },
    { id: '2', name: 'shop-staging', pipeline: 'shop', stage: 'staging' },
  ];

  it('picks the staging sibling', () => {
    assert.equal(resolveStage(list, list[0], 'staging').name, 'shop-staging');
  });

  it('picks production from staging', () => {
    assert.equal(resolveStage(list, list[1], 'production').name, 'shop');
  });

  it('fails when the stage is missing', () => {
    assert.throws(() => resolveStage(list, list[0], 'development'), /no app at stage/);
  });
});

describe('env key precedence', () => {
  it('keySource reports env when TASKCLAN_API_KEY is set', async () => {
    const prev = process.env.TASKCLAN_API_KEY;
    process.env.TASKCLAN_API_KEY = 'sk_cloud_test';
    try {
      const { keySource, loadKey } = await import('../src/config.js');
      assert.equal(keySource(), 'env');
      assert.equal(loadKey(), 'sk_cloud_test');
    } finally {
      if (prev === undefined) delete process.env.TASKCLAN_API_KEY;
      else process.env.TASKCLAN_API_KEY = prev;
    }
  });
});
