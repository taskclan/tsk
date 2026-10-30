/**
 * `tsk deploy` — build and release the app's connected repository.
 *
 * Deliberately NOT an uploader. The platform builds from the repo the app is
 * connected to, so a CLI that shipped the working directory would produce a
 * release nobody could reproduce from git — and the deploy that follows the
 * next push would silently undo it.
 *
 * `--ref` deploys any branch/sha without changing the lasting git link.
 * `--stage` resolves a pipeline sibling (staging vs production).
 */
import { api, resolveApp } from '../api.js';
import { bold, cyan, dim, green, out, yellow } from '../ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TERMINAL = new Set(['ready', 'error', 'cancelled']);

export async function deploy(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const body = {};
  if (args.ref) body.ref = String(args.ref);
  if (args.plan) body.plan = String(args.plan);
  if (args.repo) body.repo = String(args.repo);
  if (args.region) body.region = String(args.region);
  if (args['max-instances'] != null) body.maxInstances = Number(args['max-instances']);
  if (args['root-dir']) body.rootDir = String(args['root-dir']);

  const label = args.ref ? `${app.name}@${args.ref}` : app.name;
  out(`  Deploying ${bold(label)}…`);
  const res = await api(`/api/cloud/v1/sites/${app.id}/deploy-service`, { method: 'POST', body });
  const id = res.deploymentId ?? res.id ?? null;
  if (!id) {
    out(`  ${green('Started.')}`);
    return;
  }
  if (args.detach) {
    out(`  ${green('Started.')} ${dim(id)}`);
    return;
  }

  let last = '';
  // Polled rather than streamed: the build log endpoint is per-deployment and
  // the status is what the caller is actually waiting on.
  for (;;) {
    await sleep(5000);
    let d;
    try {
      const list = await api(`/api/cloud/v1/sites/${app.id}/deployments`);
      const rows = list.deployments ?? list ?? [];
      d = (Array.isArray(rows) ? rows : []).find((x) => x.id === id);
    } catch {
      continue; // a blip while a build runs is not a failed build
    }
    if (!d) continue;
    const state = `${d.status}${d.phase ? ` · ${d.phase}` : ''}`;
    if (state !== last) { out(`  ${dim(state)}`); last = state; }
    if (TERMINAL.has(d.status)) {
      if (d.status === 'ready') {
        out(`  ${green('Live.')} ${d.url ? cyan(d.url) : ''}`);
        return;
      }
      out(`  ${yellow(d.status)}${d.error ? ` — ${d.error}` : ''}`);
      process.exitCode = 1;
      return;
    }
  }
}
