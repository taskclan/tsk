/**
 * `tsk apps:create` — provision a new Cloud app (service).
 */
import { api, listApps } from '../api.js';
import { writeProject } from '../project.js';
import { bold, cyan, dim, green, out } from '../ui.js';
import { appUrl } from './apps.js';

export async function appsCreate(args) {
  const name = (args._[0] || args.name || '').trim();
  if (!name) {
    throw new Error('usage: tsk apps:create NAME [--pipeline X] [--stage staging|production] [--link] [--plan PLAN]');
  }

  const existing = await listApps();
  const clash = existing.find((s) => s.name === name);
  if (clash) throw new Error(`an app called "${name}" already exists in this workspace`);

  const res = await api('/api/cloud/v1/sites', {
    method: 'POST',
    body: { name, type: 'service' },
  });
  const site = res.site ?? res;
  if (!site?.id) throw new Error('the API created nothing — try again from the console');

  const pipeline = (args.pipeline || '').trim();
  const stage = (args.stage || 'production').trim();
  if (pipeline) {
    await api(`/api/cloud/v1/sites/${site.id}/pipeline`, {
      method: 'POST',
      body: { pipeline, stage },
    });
  }

  if (args.plan) {
    out(`  ${dim(`Plan "${args.plan}" will apply on the first deploy (\`tsk deploy --plan ${args.plan}\`).`)}`);
  }

  if (args.link) {
    writeProject({ app: site.name, appId: site.id });
    out(`  Linked this directory to ${bold(site.name)}.`);
  }

  out();
  out(`  ${green('Created')} ${bold(site.name)}`);
  const url = appUrl(site);
  if (url) out(`  ${cyan(url)}`);
  out();
  out('  Next:');
  out(`    tsk git:connect owner/repo --app ${site.name}`);
  out(`    tsk deploy --app ${site.name}`);
  out();
}
