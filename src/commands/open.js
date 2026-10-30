/**
 * Open the live app or the Cloud console in a browser.
 */
import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { resolveApp } from '../api.js';
import { consoleBase } from '../config.js';
import { appUrl } from './apps.js';
import { bold, cyan, dim, out } from '../ui.js';

export async function openApp(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const url = appUrl(app);
  if (!url) throw new Error(`"${app.name}" has no live URL yet — deploy first`);
  out(`  Opening ${cyan(url)}`);
  await browse(url);
}

export async function openConsole(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  // Console deep-link: /cloud/sites/<id> matches the hosting console routes.
  const url = `${consoleBase().replace(/\/$/, '')}/cloud/sites/${app.id}`;
  out(`  Opening console for ${bold(app.name)}`);
  out(`  ${dim(url)}`);
  await browse(url);
}

function browse(url) {
  const p = platform();
  const cmd = p === 'darwin' ? 'open' : p === 'win32' ? 'cmd' : 'xdg-open';
  const argv = p === 'win32' ? ['/c', 'start', '', url] : [url];
  return new Promise((resolve, reject) => {
    execFile(cmd, argv, (err) => (err ? reject(err) : resolve()));
  });
}
