/**
 * `tsk login` — the OAuth device flow.
 *
 * The browser does the authenticating, not this process. That is the whole
 * point of the device flow: the CLI never sees a password, and the key it ends
 * up with was minted for this machine and can be revoked on its own.
 *
 * The key is never printed. The console says it is "written to your keychain,
 * not printed here", and a token echoed into a terminal ends up in scrollback,
 * in a screen recording, and in the screenshot somebody pastes into an issue.
 */
import { execFile } from 'node:child_process';
import { hostname, platform, userInfo } from 'node:os';

import { publicPost } from '../api.js';
import { saveKey, consoleBase } from '../config.js';
import { bold, cyan, dim, green, out, fail } from '../ui.js';

const openBrowser = (url) => {
  const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
  return new Promise((resolve) => execFile(cmd, [url], () => resolve()));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function login(args) {
  const label = args.label || `${userInfo().username}@${hostname()}`;
  const started = await publicPost('/api/cloud/v1/auth/device/start', { label });
  if (!started.ok) fail(started.body?.error || `could not start sign-in (${started.status})`);

  const { device_code: deviceCode, user_code: userCode, expires_in: expiresIn } = started.body;
  const verify = started.body.verification_uri_complete
    || `${consoleBase()}/cloud/device?code=${encodeURIComponent(userCode)}`;
  let interval = Math.max(2, Number(started.body.interval) || 5);

  out();
  out(`  Confirmation code  ${bold(userCode)}`);
  out(`  Approve at         ${cyan(verify)}`);
  out();
  if (!args['no-browser']) {
    out(dim('  Opening your browser…'));
    await openBrowser(verify);
  }
  out(dim('  Waiting for approval…'));

  const deadline = Date.now() + (Number(expiresIn) || 900) * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const poll = await publicPost('/api/cloud/v1/auth/device/token', { device_code: deviceCode });
    if (poll.ok && poll.body?.access_token) {
      const where = saveKey(poll.body.access_token);
      out();
      out(`  ${green('Signed in.')} Key stored in your ${where === 'keychain' ? 'keychain' : 'config file (0600)'}.`);
      return;
    }
    const code = poll.body?.error;
    if (code === 'authorization_pending') continue;
    // The server asking us to back off is not a failure; obeying it is what
    // keeps a slow approval from being rate-limited into one.
    if (code === 'slow_down') { interval += 5; continue; }
    if (code === 'access_denied') fail('the request was declined in the browser');
    if (code === 'expired_token') fail('the code expired — run `tsk login` again');
    fail(poll.body?.error || `sign-in failed (${poll.status})`);
  }
  fail('timed out waiting for approval — run `tsk login` again');
}
