#!/usr/bin/env node
/**
 * tsk — the Taskclan Cloud CLI.
 *
 * Commands are named after what they do to the platform, and the colon forms
 * (`ps:scale`, `releases:rollback`) match what the console's CLI setup screen
 * tells people to type. Those two have to stay in step: a command the console
 * advertises and the binary does not answer to is worse than no CLI at all.
 */
import { parseArgs, leadingIntent } from '../src/args.js';
import { ApiError } from '../src/api.js';
import { bold, cyan, dim, out, fail } from '../src/ui.js';
import { login } from '../src/commands/login.js';
import { logout } from '../src/commands/logout.js';
import { apps } from '../src/commands/apps.js';
import { deploy } from '../src/commands/deploy.js';
import { logs } from '../src/commands/logs.js';
import { ps, psScale } from '../src/commands/ps.js';
import { releases, releasesRollback } from '../src/commands/releases.js';
import { whoami } from '../src/commands/whoami.js';

const VERSION = '0.1.0';

const COMMANDS = {
  login, logout, apps, deploy, logs, whoami,
  ps, 'ps:scale': psScale,
  releases, 'releases:rollback': releasesRollback,
};

const HELP = `
  ${bold('tsk')} — Taskclan Cloud

  ${bold('Getting started')}
    tsk login                      authorise this machine in a browser
    tsk apps                       the apps this key can reach
    tsk deploy --app NAME          build and release the connected repository

  ${bold('Running things')}
    tsk logs --tail --app NAME     stream logs from every container
    tsk ps --app NAME              what the formation looks like
    tsk ps:scale web=3 --app NAME  change the formation without a rebuild
    tsk releases --app NAME        deployment history
    tsk releases:rollback --app N  back to the previous release, no rebuild

  ${bold('Account')}
    tsk whoami                     which workspace this key belongs to
    tsk logout                     forget the key on this machine

  ${dim('Docs')} ${cyan('https://cloud.taskclan.com/cloud/cli-setup')}
`;

async function main() {
  const argv = process.argv.slice(2);
  const name = argv[0];
  const args = parseArgs(argv.slice(1));

  // A leading flag is a request, not a command name. See leadingIntent.
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
