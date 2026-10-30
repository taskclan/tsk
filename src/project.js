/**
 * Per-directory link to a Cloud app.
 *
 * Lives at `.taskclan/config.json` so it can be committed. Only non-secret
 * fields: app name and id. Secrets stay in the keychain / CI env.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '.taskclan';
const FILE = join(DIR, 'config.json');

export function projectConfigPath(cwd = process.cwd()) {
  return join(cwd, FILE);
}

export function readProject(cwd = process.cwd()) {
  try {
    return JSON.parse(readFileSync(join(cwd, FILE), 'utf8'));
  } catch {
    return null;
  }
}

export function writeProject(patch, cwd = process.cwd()) {
  mkdirSync(join(cwd, DIR), { recursive: true });
  const next = { ...readProject(cwd), ...patch };
  writeFileSync(join(cwd, FILE), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function clearProject(cwd = process.cwd()) {
  const path = join(cwd, FILE);
  if (existsSync(path)) unlinkSync(path);
}
