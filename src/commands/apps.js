import { api, listApps, resolveApp, ApiError } from '../api.js';
import { clearProject, readProject } from '../project.js';
import { bold, cyan, dim, green, out, table } from '../ui.js';

/**
 * The address a person would actually open.
 *
 * An app can have a custom domain, a managed subdomain and an internal host,
 * and they are not interchangeable — printing the internal host to somebody
 * who asked where their app is sends them to the wrong door.
 */
export function appUrl(site) {
  if (site.customDomain) return `https://${site.customDomain}`;
  if (site.liveUrl) return site.liveUrl;
  if (site.host) return `https://${site.host}`;
  return '';
}

/** `tsk apps` — what this key can reach. */
export async function apps() {
  const list = await listApps();
  if (list.length === 0) {
    out(dim('  No apps in this workspace yet.'));
    return;
  }
  out();
  table([
    [bold('NAME'), bold('STATUS'), bold('LAST DEPLOY'), bold('URL')],
    ...list.map((s) => [s.name, s.status ?? '', s.deployStatus ?? '', appUrl(s)]),
  ]);
  out();
}

/**
 * `tsk apps:info [--app]` — id, url, git remote, pipeline/stage, last deploy, plan.
 */
export async function appsInfo(args) {
  const app = await resolveApp(args.app || args._[0], { stage: args.stage });
  const detail = await api(`/api/cloud/v1/sites/${app.id}`);
  const site = detail.site || app;
  const deployments = Array.isArray(detail.deployments) ? detail.deployments : [];

  let gitRemote = '';
  try {
    const tok = await api(`/api/cloud/v1/sites/${app.id}/deploy-token`);
    gitRemote = tok.gitRemote || '';
  } catch {
    /* older engines / no subdomain */
  }

  let github = '';
  try {
    const g = await api(`/api/cloud/v1/sites/${app.id}/git`);
    const link = g.git || g;
    if (link?.repoFullName) {
      github = link.branch ? `${link.repoFullName}@${link.branch}` : link.repoFullName;
    }
  } catch {
    /* not connected */
  }

  const last = deployments[0];
  const lastLine = last
    ? [
        last.status || last.phase || '—',
        last.commitSha ? String(last.commitSha).slice(0, 12) : '',
        last.finishedAt || last.createdAt || '',
      ].filter(Boolean).join('  ')
    : '—';

  const plan = site.instanceType || site.plan || '—';
  const url = appUrl(site) || '—';
  const pipeline = site.pipeline || '—';
  const stage = site.stage || '—';

  out();
  out(`  ${bold(site.name)}`);
  out();
  row('ID', site.id);
  row('Status', site.status || '—');
  row('Plan', plan);
  row('URL', url === '—' ? dim('—') : cyan(url));
  row('Git remote', gitRemote ? cyan(gitRemote) : dim('—'));
  row('GitHub', github || dim('—'));
  row('Pipeline', pipeline === '—' ? dim('—') : pipeline);
  row('Stage', stage === '—' ? dim('—') : stage);
  row('Last deploy', lastLine === '—' ? dim('—') : lastLine);
  out();
}

function row(label, value) {
  out(`  ${dim(label.padEnd(12))} ${value}`);
}

/**
 * Confirm destroy: exact app name via `--confirm NAME`.
 * A bare `--yes` is never enough — deleting frees compute, DBs and domains.
 */
export function destroyConfirm(appName, args) {
  const confirm = args.confirm;
  // `parseArgs` sets a flag with no value to `true` — treat that like missing.
  if (confirm === true || confirm === undefined || confirm === '') {
    throw new ApiError(
      `destroying an app needs \`--confirm ${appName}\` (the exact name) — \`--yes\` alone is not enough`,
      400,
    );
  }
  if (String(confirm) !== String(appName)) {
    throw new ApiError(
      `--confirm must match the app name exactly (got "${confirm}", expected "${appName}")`,
      400,
    );
  }
}

/**
 * `tsk apps:destroy NAME --confirm NAME` — delete the site and free its resources.
 * Clears `.taskclan/config.json` when it pointed at the destroyed app.
 */
export async function appsDestroy(args) {
  const name = (args._[0] || args.app || '').trim();
  if (!name) {
    throw new ApiError('usage: tsk apps:destroy NAME --confirm NAME', 400);
  }
  // Resolve by the positional/name first so typos fail before confirm checks.
  const app = await resolveApp(name, { stage: args.stage });
  destroyConfirm(app.name, args);

  out(`  Destroying ${bold(app.name)}…`);
  await api(`/api/cloud/v1/sites/${app.id}`, { method: 'DELETE' });

  const linked = readProject();
  if (linked && (linked.app === app.name || linked.appId === app.id)) {
    clearProject();
    out(`  ${dim('Cleared local link (.taskclan/config.json).')}`);
  }

  out(`  ${green('Destroyed.')} ${dim('Resources for this app are being released.')}`);
}
