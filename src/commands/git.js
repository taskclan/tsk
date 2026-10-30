/**
 * GitHub connect — the path to "git push → deploy" today.
 */
import { api, resolveApp } from '../api.js';
import { bold, cyan, dim, green, out } from '../ui.js';

export async function gitConnect(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const repo = (args._[0] || args.repo || '').trim();
  if (!repo) throw new Error('usage: tsk git:connect owner/repo [--branch main]');
  const branch = (args.branch || 'main').trim();
  const body = { repo, branch };
  if (args.installation != null) body.installationId = Number(args.installation);

  out(`  Connecting ${bold(repo)}@${branch} → ${bold(app.name)}…`);
  await api(`/api/cloud/v1/sites/${app.id}/git`, { method: 'POST', body });
  out(`  ${green('Connected.')}`);
  out();
  out(`  Pushes to ${cyan(`${repo}`)} on branch ${bold(branch)} deploy this app.`);
  out(`  Or deploy any ref now: ${dim(`tsk deploy --ref ${branch} --app ${app.name}`)}`);
  out();
}

export async function gitRemote(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const data = await api(`/api/cloud/v1/sites/${app.id}/git`);
  const git = data.git ?? data;
  if (!git?.repoFullName && !git?.repo) {
    out(dim('  No repository connected.'));
    out(dim('  tsk git:connect owner/repo --branch main'));
    return;
  }
  const repo = git.repoFullName || git.repo;
  const branch = git.branch || 'main';
  out();
  out(`  App     ${bold(app.name)}`);
  out(`  Repo    ${cyan(repo)}`);
  out(`  Branch  ${bold(branch)}`);
  out();
  out(`  Cloud builds from GitHub today (no \`git push cloud\` receive yet).`);
  out(`  Add a GitHub remote if needed, then:`);
  out(`    git push origin ${branch}`);
  out(`  Or deploy a different ref without changing the link:`);
  out(`    tsk deploy --ref <branch-or-sha> --app ${app.name}`);
  out();
}

export async function gitDisconnect(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  await api(`/api/cloud/v1/sites/${app.id}/git`, { method: 'DELETE' });
  out(`  ${green('Disconnected')} git from ${bold(app.name)}.`);
}
