/**
 * GitHub connect + Heroku-style Cloud git remote
 * (https://cloud.taskclan.com/git/<subdomain>.git).
 */
import { execFileSync } from 'node:child_process';
import { api, resolveApp } from '../api.js';
import { bold, cyan, dim, green, out, yellow } from '../ui.js';

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
  out(`  Pushes to ${cyan(repo)} on branch ${bold(branch)} deploy this app.`);
  out(`  Or: ${dim(`tsk deploy --ref ${branch} --app ${app.name}`)}`);
  out(`  Or use the Cloud git remote: ${dim('tsk git:remote --add')}`);
  out();
}

export async function gitRemote(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const info = await api(`/api/cloud/v1/sites/${app.id}/deploy-token`);
  const remote = info.gitRemote;
  if (!remote) {
    out(dim('  This app has no git remote yet (missing subdomain).'));
    return;
  }

  out();
  out(`  App     ${bold(app.name)}`);
  out(`  Remote  ${cyan(remote)}`);
  out(`  Token   ${info.hasToken ? dim(`set (${info.prefix}…)`) : yellow('not minted yet')}`);
  out();

  if (args.add || args.rotate) {
    let token = null;
    if (!info.hasToken || args.rotate) {
      const minted = await api(`/api/cloud/v1/sites/${app.id}/deploy-token`, { method: 'POST', body: {} });
      token = minted.token;
      out(`  ${green('Minted deploy token')} ${dim('(shown once — password for the remote)')}`);
      out(`  ${yellow(token)}`);
      out();
    } else {
      out(`  ${dim('Token already exists. Pass --rotate to mint a new one (invalidates the old).')}`);
      out(`  ${dim('Add the remote with a token you already saved, or rotate first.')}`);
      out();
    }

    const name = (args.name || 'cloud').toString();
    if (token) {
      // Embed token in the URL like Heroku: https://token@host/git/app.git
      // Username is ignored by Cloud; password is the deploy token.
      const withAuth = remote.replace('https://', `https://taskclan:${encodeURIComponent(token)}@`);
      try {
        execFileSync('git', ['remote', 'remove', name], { stdio: 'ignore' });
      } catch { /* no prior remote */ }
      try {
        execFileSync('git', ['remote', 'add', name, withAuth], { stdio: 'inherit' });
        out(`  ${green('Added')} git remote ${bold(name)}`);
        out(`    git push ${name} main`);
      } catch {
        out(`  Add manually:`);
        out(`    git remote add ${name} ${withAuth}`);
      }
    } else {
      out(`  Without rotating:`);
      out(`    git remote add ${name} ${remote}`);
      out(`    # git will prompt; password = deploy token from a prior mint`);
    }
    out();
    return;
  }

  // Also show GitHub link if any
  try {
    const data = await api(`/api/cloud/v1/sites/${app.id}/git`);
    const git = data.git ?? data;
    if (git?.repoFullName || git?.repo) {
      out(`  GitHub  ${cyan(git.repoFullName || git.repo)} @ ${bold(git.branch || 'main')}`);
      out();
    }
  } catch { /* unlinked is fine */ }

  out(`  Install the remote (mints a token if needed):`);
  out(`    tsk git:remote --add [--rotate]`);
  out(`  Then:`);
  out(`    git push cloud main`);
  out(`    git push cloud feature:main   ${dim('# push a branch to the app\'s main')}`);
  out();
}

export async function gitDisconnect(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  await api(`/api/cloud/v1/sites/${app.id}/git`, { method: 'DELETE' });
  out(`  ${green('Disconnected')} GitHub from ${bold(app.name)}.`);
  out(`  ${dim('Cloud git remote (deploy token) is unchanged — revoke via tsk git:remote --rotate if needed.')}`);
}
