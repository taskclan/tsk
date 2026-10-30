#!/usr/bin/env node
/**
 * tsk — the Taskclan Cloud CLI.
 *
 * Commands are named after what they do to the platform, and the colon forms
 * (`ps:scale`, `releases:rollback`) match what the console's CLI setup screen
 * tells people to type. Those two have to stay in step: a command the console
 * advertises and the binary does not answer to is worse than no CLI at all.
 */
import { readFileSync } from 'node:fs';

import { parseArgs, leadingIntent } from '../src/args.js';
import { ApiError } from '../src/api.js';
import { bold, cyan, dim, out, fail } from '../src/ui.js';
import { login } from '../src/commands/login.js';
import { logout } from '../src/commands/logout.js';
import { apps } from '../src/commands/apps.js';
import { appsCreate } from '../src/commands/create.js';
import { deploy } from '../src/commands/deploy.js';
import { logs } from '../src/commands/logs.js';
import { ps, psScale } from '../src/commands/ps.js';
import { releases, releasesRollback } from '../src/commands/releases.js';
import { whoami } from '../src/commands/whoami.js';
import { link, unlink } from '../src/commands/link.js';
import { showConfig } from '../src/commands/showConfig.js';
import { env, envSet, envUnset } from '../src/commands/env.js';
import { db, dbCreate, dbAttach, dbDetach } from '../src/commands/db.js';
import { gitConnect, gitRemote, gitDisconnect } from '../src/commands/git.js';

const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

const COMMANDS = {
  login, logout, apps, deploy, logs, whoami, link, unlink, config: showConfig,
  'apps:create': appsCreate,
  ps, 'ps:scale': psScale,
  releases, 'releases:rollback': releasesRollback,
  env, 'env:set': envSet, 'env:unset': envUnset,
  db, 'db:create': dbCreate, 'db:attach': dbAttach, 'db:detach': dbDetach,
  'git:connect': gitConnect, 'git:remote': gitRemote, 'git:disconnect': gitDisconnect,
};

const HELP = `
  ${bold('tsk')} — Taskclan Cloud

  ${bold('Getting started')}
    tsk login                         authorise this machine in a browser
    tsk apps                          the apps this key can reach
    tsk apps:create NAME              provision a new app
    tsk link --app NAME               associate this directory with an app
    tsk git:connect owner/repo        wire GitHub → auto-deploy on push
    tsk deploy [--ref BRANCH]         build and release

  ${bold('Running things')}
    tsk logs --tail --app NAME        stream logs from every container
    tsk ps --app NAME                 what the formation looks like
    tsk ps:scale web=3 --app NAME     change the formation without a rebuild
    tsk releases --app NAME           deployment history
    tsk releases:rollback --app N     back to the previous release

  ${bold('Config & data')}
    tsk env / env:set / env:unset     environment variables (secrets masked)
    tsk db / db:create                Neon, Supabase, or Redis
    tsk config                        resolved settings (no secrets)

  ${bold('Account')}
    tsk whoami                        which workspace this key belongs to
    tsk logout                        forget the key on this machine

  ${dim('CI')} set ${bold('TASKCLAN_API_KEY')} — no keychain required.
  ${dim('Docs')} ${cyan('https://cloud.taskclan.com/cloud/cli-setup')}
  ${dim('Surface')} docs/COMMAND_SURFACE.md
`;

async function main() {
  const argv = process.argv.slice(2);
  const name = argv[0];
  const args = parseArgs(argv.slice(1));

  const intent = leadingIntent(name);
  if (intent === 'help' || args.help) { out(HELP); return; }
  if (intent === 'version' || args.version) { out(VERSION); return; }

  const run = COMMANDS[name];
  if (!run) {
    const near = Object.keys(COMMANDS).filter((c) => c.startsWith(name.split(':')[0]));
    fail(`no command "${name}"${near.length ? ` — did you mean ${near.map((c) => `\`tsk ${c}\``).join(' or ')}?` : ' — try `tsk help`'}`);
  }
  await run(args);
}

main().catch((e) => {
  if (e instanceof ApiError) fail(e.message);
  fail(e?.message || 'something went wrong');
});
