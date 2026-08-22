/**
 * `tsk releases` and `tsk releases:rollback`.
 *
 * Rollback re-points at a previous build rather than rebuilding, so it is fast
 * and it ships exactly the artifact that was live before — a rebuild of an old
 * commit is a different thing that only usually matches.
 */
import { api, resolveApp, ApiError } from '../api.js';
import { bold, dim, green, out, table } from '../ui.js';

async function history(appId) {
  const list = await api(`/api/cloud/v1/sites/${appId}/deployments`);
  const rows = list.deployments ?? list ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function releases(args) {
  const app = await resolveApp(args.app);
  const rows = (await history(app.id)).slice(0, Number(args.limit) || 15);
  if (rows.length === 0) { out(dim('  No deployments yet.')); return; }
  out();
  table([[bold('ID'), bold('STATUS'), bold('COMMIT'), bold('WHEN')],
    ...rows.map((d) => [
      String(d.id).slice(0, 8),
      d.status ?? '',
      (d.commitSha ?? '').slice(0, 8),
      d.createdAt ?? d.created_at ?? '',
    ])]);
  out();
}

export async function releasesRollback(args) {
  const app = await resolveApp(args.app);
  const rows = await history(app.id);
  const ready = rows.filter((d) => d.status === 'ready');
  const wanted = args._[0];

  let target;
  if (wanted) {
    target = ready.find((d) => String(d.id).startsWith(wanted) || (d.commitSha ?? '').startsWith(wanted));
    if (!target) throw new ApiError(`no ready deployment matching "${wanted}"`, 404);
  } else {
    // The one before whatever is live now — "roll back" with no argument can
    // only sensibly mean the previous good release.
    target = ready[1];
    if (!target) throw new ApiError('there is no earlier ready deployment to roll back to', 400);
  }

  await api(`/api/cloud/v1/sites/${app.id}/deployments`, { method: 'POST', body: { rollbackTo: target.id } });
  out(`  ${green('Rolled back.')} ${bold(app.name)} is serving ${String(target.id).slice(0, 8)}${target.commitSha ? ` (${target.commitSha.slice(0, 8)})` : ''}.`);
}
