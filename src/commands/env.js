/**
 * Env vars without opening the console.
 */
import { api, resolveApp } from '../api.js';
import { bold, dim, green, out, table, yellow } from '../ui.js';
import { readFileSync } from 'node:fs';

export async function env(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const data = await api(`/api/cloud/v1/sites/${app.id}/env${args.reveal ? '?reveal=1' : ''}`);
  const rows = data.env ?? data.variables ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    out(dim('  No environment variables.'));
    return;
  }
  out();
  table([
    [bold('KEY'), bold('SCOPE'), bold('VALUE')],
    ...rows.map((r) => [
      r.key,
      r.scope || 'runtime',
      r.isSecret && !data.revealed ? dim('••••••••') : (r.value ?? ''),
    ]),
  ]);
  out();
  if (data.pending?.length) {
    out(`  ${yellow(`${data.pending.length} change(s) pending until the next deploy.`)}`);
  }
}

export async function envSet(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  if (args.file) {
    const text = readFileSync(args.file, 'utf8');
    const pairs = parseEnvFile(text);
    if (!args.yes && pairs.length > 3) {
      out(`  Will set ${pairs.length} keys from ${args.file}. Pass --yes to confirm.`);
      for (const [k] of pairs) out(`    ${k}`);
      throw new Error('refusing bulk set without --yes');
    }
    for (const [key, value] of pairs) {
      await api(`/api/cloud/v1/sites/${app.id}/env`, {
        method: 'POST',
        body: { key, value, isSecret: args.secret === true },
      });
    }
    out(`  ${green('Set')} ${pairs.length} variable(s) on ${bold(app.name)}.`);
    return;
  }
  const key = args._[0] || args.key;
  let value = args._[1];
  if (args._[0] && args._[0].includes('=') && value === undefined) {
    const i = args._[0].indexOf('=');
    await api(`/api/cloud/v1/sites/${app.id}/env`, {
      method: 'POST',
      body: { key: args._[0].slice(0, i), value: args._[0].slice(i + 1), isSecret: args.secret === true },
    });
    out(`  ${green('Set')} ${bold(args._[0].slice(0, i))} on ${bold(app.name)}.`);
    return;
  }
  if (!key || value === undefined) throw new Error('usage: tsk env:set KEY VALUE | KEY=VALUE [--secret] [--file .env --yes]');
  await api(`/api/cloud/v1/sites/${app.id}/env`, {
    method: 'POST',
    body: { key, value: String(value), isSecret: args.secret === true },
  });
  out(`  ${green('Set')} ${bold(key)} on ${bold(app.name)}.`);
}

export async function envUnset(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const key = args._[0] || args.key;
  if (!key) throw new Error('usage: tsk env:unset KEY');
  await api(`/api/cloud/v1/sites/${app.id}/env`, { method: 'DELETE', body: { key } });
  out(`  ${green('Removed')} ${bold(key)} from ${bold(app.name)}.`);
}

function parseEnvFile(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out.push([t.slice(0, i), v]);
  }
  return out;
}
