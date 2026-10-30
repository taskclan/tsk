/**
 * Managed databases (Neon / Supabase / Redis) and BYO attach.
 */
import { api, resolveApp } from '../api.js';
import { bold, dim, green, out, table, yellow } from '../ui.js';

export async function db(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const data = await api(`/api/cloud/v1/sites/${app.id}/databases`);
  const rows = data.databases ?? [];
  if (!rows.length && !data.supabase) {
    out(dim('  No databases attached.'));
    out(dim('  Provision one: tsk db:create --provider neon|supabase [--plan starter]'));
    return;
  }
  out();
  if (rows.length) {
    table([
      [bold('NAME'), bold('PROVIDER'), bold('ENGINE'), bold('ENV KEY'), bold('URL')],
      ...rows.map((r) => [
        r.name || r.id,
        r.provider || 'byo',
        r.engine || 'postgres',
        r.envKey || '',
        args['show-url'] ? (r.url || dim('(stored)')) : dim('(hidden — pass --show-url)'),
      ]),
    ]);
  }
  if (data.supabase) {
    out();
    out(`  ${bold('Inferred Supabase')} ${data.supabase.ref || ''} ${dim(data.supabase.inferredFrom || '')}`);
  }
  out();
}

export async function dbCreate(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const engine = args.engine === 'redis' ? 'redis' : 'postgres';
  const provider = engine === 'redis' ? undefined : (args.provider === 'supabase' ? 'supabase' : 'neon');
  const plan = args.plan || (engine === 'redis' ? 'payg' : provider === 'supabase' ? 'starter' : 'standard');
  const body = {
    action: 'provision',
    engine,
    plan,
    name: args.name || args._[0] || undefined,
    envKey: args['env-key'] || undefined,
  };
  if (provider) body.provider = provider;

  out(`  Provisioning ${engine === 'redis' ? 'Redis' : provider} (${plan}) for ${bold(app.name)}…`);
  const res = await api(`/api/cloud/v1/sites/${app.id}/databases`, { method: 'POST', body });
  const dbRow = res.database;
  out(`  ${green('Ready.')} ${dbRow?.name || dbRow?.id || ''}`);
  out(`  ${yellow('Connection URL is in the app env — pass --show-url on `tsk db` to print it.')}`);
  out(`  ${dim('Redeploy for the container to pick up new env: tsk deploy')}`);
}

export async function dbAttach(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const name = args.name || args._[0];
  const url = args.url || args._[1];
  if (!name || !url) throw new Error('usage: tsk db:attach NAME URL [--env-key DATABASE_URL]');
  await api(`/api/cloud/v1/sites/${app.id}/databases`, {
    method: 'POST',
    body: { name, url, envKey: args['env-key'] },
  });
  out(`  ${green('Attached')} ${bold(name)} to ${bold(app.name)}.`);
}

export async function dbDetach(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const dbId = args.id || args._[0];
  if (!dbId) throw new Error('usage: tsk db:detach DB_ID');
  await api(`/api/cloud/v1/sites/${app.id}/databases?dbId=${encodeURIComponent(dbId)}`, { method: 'DELETE' });
  out(`  ${green('Detached')} ${bold(dbId)} from ${bold(app.name)}.`);
}
