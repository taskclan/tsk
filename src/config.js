/**
 * Where the CLI keeps its credentials.
 *
 * The account key goes to the macOS keychain when there is one, and to a
 * 0600 file otherwise. The console tells the user their token is "written to
 * your keychain, not printed here" — that promise has to be kept by this file
 * or it is just a nicer-sounding way of writing a secret to disk.
 *
 * The rest of the config — the API base, the default app — is not secret and
 * lives in plain JSON beside it, so it can be inspected and edited.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync, unlinkSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_API_BASE = 'https://engine.taskclan.com';
export const DEFAULT_CONSOLE_BASE = 'https://cloud.taskclan.com';

const DIR = join(homedir(), '.taskclan');
const FILE = join(DIR, 'config.json');
const SERVICE = 'taskclan-cli';
const ACCOUNT = 'account-key';

const canKeychain = () => platform() === 'darwin';

export function readConfig() {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function writeConfig(patch) {
  mkdirSync(DIR, { recursive: true });
  const next = { ...readConfig(), ...patch };
  writeFileSync(FILE, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  chmodSync(FILE, 0o600);
  return next;
}

/** Store the key where the platform can protect it. */
export function saveKey(key) {
  if (canKeychain()) {
    try {
      // -U updates in place, so signing in twice does not leave two entries.
      execFileSync('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', ACCOUNT, '-w', key], { stdio: 'ignore' });
      writeConfig({ keyStore: 'keychain' });
      return 'keychain';
    } catch {
      // Fall through: a keychain that refuses is not a reason to fail the login.
    }
  }
  writeConfig({ keyStore: 'file', accountKey: key });
  return 'file';
}

export function loadKey() {
  const cfg = readConfig();
  if (cfg.keyStore === 'keychain' || (canKeychain() && !cfg.accountKey)) {
    try {
      return execFileSync('security', ['find-generic-password', '-s', SERVICE, '-a', ACCOUNT, '-w'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || null;
    } catch {
      return cfg.accountKey ?? null;
    }
  }
  return cfg.accountKey ?? null;
}

export function clearKey() {
  if (canKeychain()) {
    try { execFileSync('security', ['delete-generic-password', '-s', SERVICE, '-a', ACCOUNT], { stdio: 'ignore' }); } catch { /* not there */ }
  }
  const cfg = readConfig();
  delete cfg.accountKey;
  delete cfg.keyStore;
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 });
}

export function configPath() { return FILE; }
export function forgetConfig() { if (existsSync(FILE)) unlinkSync(FILE); }

export function apiBase() {
  return process.env.TASKCLAN_API_URL?.trim() || readConfig().apiBase || DEFAULT_API_BASE;
}
export function consoleBase() {
  return process.env.TASKCLAN_CONSOLE_URL?.trim() || readConfig().consoleBase || DEFAULT_CONSOLE_BASE;
}
