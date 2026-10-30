/**
 * `tsk releases`, `tsk rollback`, and `tsk releases:rollback`.
 *
 * Rollback re-points at a previous build rather than rebuilding, so it is fast
 * and it ships exactly the artifact that was live before — a rebuild of an old
 * commit is a different thing that only usually matches.
 */
import { api, resolveApp, ApiError } from '../api.js';
import { bold, cyan, dim, green, out, table, yellow } from '../ui.js';

async function history(appId) {
  const list = await api(`/api/cloud/v1/sites/${appId}/deployments`);
  const rows = list.deployments ?? list ?? [];
  return Array.isArray(rows) ? rows : [];
}

/** Newest-first ready deploys; index 0 is what is (or was last) serving. */
function readyDeploys(rows) {
  return rows.filter((d) => d.status === 'ready');
}

function shortId(d) {
  return String(d.id).slice(0, 8);
}

function when(d) {
  return d.finishedAt || d.finished_at || d.createdAt || d.created_at || '';
}

function sourceLabel(d) {
  const s = d.source || '';
  if (s === 'rollback') return 'rollback';
  if (s === 'git-push') return 'git-push';
  if (s === 'service' || s === 'deploy-service') return 'deploy';
  return s || '—';
}

export async function releases(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const rows = (await history(app.id)).slice(0, Number(args.limit) || 15);
  if (rows.length === 0) { out(dim('  No deployments yet.')); return; }

  const liveId = readyDeploys(rows)[0]?.id;
  out();
  out(`  ${bold(app.name)} releases`);
  out();
  table([
    [bold('ID'), bold(''), bold('STATUS'), bold('SOURCE'), bold('COMMIT'), bold('WHEN')],
    ...rows.map((d) => [
      shortId(d),
      d.id === liveId ? green('● live') : dim(''),
      d.status ?? '',
      sourceLabel(d),
      (d.commitSha ?? d.commit_sha ?? '').slice(0, 8) || dim('—'),
      when(d),
    ]),
  ]);
  out();
  out(`  ${dim('Roll back:')} tsk rollback ${dim('[id|commit]')} ${dim(`--app ${app.name}`)}`);
  out();
}

export async function releasesRollback(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const rows = await history(app.id);
  const ready = readyDeploys(rows);
  const wanted = args._[0] || args.to || args.id;

  let target;
  let live = ready[0] || null;

  if (wanted) {
    target = ready.find((d) =>
      String(d.id).startsWith(wanted)
      || (d.commitSha ?? d.commit_sha ?? '').startsWith(wanted)
      || shortId(d) === wanted,
    );
    if (!target) {
      // Also allow rolling to a ready row that isn't in the top-of-list "ready"
      // filter edge case — search all rows but only accept ready.
      const any = rows.find((d) =>
        d.status === 'ready'
        && (String(d.id).startsWith(wanted) || (d.commitSha ?? '').startsWith(wanted)),
      );
      if (!any) throw new ApiError(`no ready deployment matching "${wanted}" — run \`tsk releases\``, 404);
      target = any;
    }
    if (live && target.id === live.id) {
      throw new ApiError(`that deployment is already live (${shortId(target)})`, 400);
    }
  } else {
    // The one before whatever is live now — "roll back" with no argument can
    // only sensibly mean the previous good release.
    target = ready[1];
    if (!target) throw new ApiError('there is no earlier ready deployment to roll back to', 400);
  }

  out(`  Rolling back ${bold(app.name)}`);
  if (live) {
    out(`    from ${cyan(shortId(live))}${(live.commitSha || '').slice(0, 8) ? ` (${live.commitSha.slice(0, 8)})` : ''} ${dim(sourceLabel(live))}`);
  }
  out(`    to   ${cyan(shortId(target))}${(target.commitSha || '').slice(0, 8) ? ` (${target.commitSha.slice(0, 8)})` : ''} ${dim(sourceLabel(target))}`);

  const res = await api(`/api/cloud/v1/sites/${app.id}/deployments`, {
    method: 'POST',
    body: { rollbackTo: target.id },
  });

  const newId = res.deployment?.id || res.id;
  out(`  ${green('Rolled back.')} ${bold(app.name)} is serving ${shortId(target)}${newId ? dim(` (rollback ${String(newId).slice(0, 8)})`) : ''}.`);
}

/** Heroku-shaped alias. */
export const rollback = releasesRollback;
