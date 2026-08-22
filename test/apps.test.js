import { test } from 'node:test';
import assert from 'node:assert/strict';

import { appUrl } from '../src/commands/apps.js';
import { pickApp } from '../src/api.js';

test('prefers the custom domain a person would actually type', () => {
  assert.equal(
    appUrl({ customDomain: 'intelligence.taskclan.com', liveUrl: 'https://x.taskclan.app', host: 'i.cloud.taskclan.com' }),
    'https://intelligence.taskclan.com',
  );
});

test('falls back to the managed URL, then the host', () => {
  assert.equal(appUrl({ liveUrl: 'https://ostrae.taskclan.app' }), 'https://ostrae.taskclan.app');
  assert.equal(appUrl({ host: 'ostrae.cloud.taskclan.com' }), 'https://ostrae.cloud.taskclan.com');
});

test('an app with no address prints nothing rather than "undefined"', () => {
  assert.equal(appUrl({}), '');
});

const LIST = [{ id: 'a1', name: 'orbit-api' }, { id: 'b2', name: 'orbit-web' }];

test('resolves by name and by id', () => {
  assert.equal(pickApp(LIST, 'orbit-web').id, 'b2');
  assert.equal(pickApp(LIST, 'b2').name, 'orbit-web');
});

test('a typo names what does exist instead of 404ing later', () => {
  assert.throws(() => pickApp(LIST, 'orbit-wbe'), /orbit-api, orbit-web/);
});

test('one app needs no --app', () => {
  assert.equal(pickApp([LIST[0]], undefined).id, 'a1');
});

test('several apps and no --app asks, listing them', () => {
  assert.throws(() => pickApp(LIST, undefined), /pass --app \(orbit-api, orbit-web\)/);
});

test('an empty workspace says so rather than asking for a name', () => {
  assert.throws(() => pickApp([], undefined), /no apps yet/);
});
