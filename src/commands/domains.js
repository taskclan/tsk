/**
 * Custom domains — list, add, remove, verify.
 */
import { api, resolveApp } from '../api.js';
import { bold, cyan, dim, green, out, table, yellow } from '../ui.js';

export async function domains(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const data = await api(`/api/cloud/v1/sites/${app.id}/domains`);
  const rows = data.domains ?? [];
  out();
  out(`  App ${bold(app.name)}${data.target ? `  ${dim(`CNAME → ${data.target}`)}` : ''}`);
  if (!rows.length) {
    out(dim('  No custom domains. Add one: tsk domains:add app.example.com'));
    out();
    return;
  }
  out();
  table([
    [bold('HOSTNAME'), bold('STATUS'), bold('SSL'), bold('DNS')],
    ...rows.map((d) => [
      d.hostname,
      d.status || '',
      d.sslStatus || '',
      summarizeDns(d.records),
    ]),
  ]);
  for (const d of rows) {
    const pending = (d.records || []).filter((r) => r.state && r.state !== 'ok' && r.state !== 'active');
    if (!pending.length) continue;
    out();
    out(`  ${yellow('Still need DNS for')} ${bold(d.hostname)}:`);
    for (const r of d.records || []) {
      out(`    ${r.type.padEnd(5)} ${r.name} → ${cyan(r.value)}${r.state ? dim(` (${r.state})`) : ''}`);
    }
  }
  out();
}

export async function domainsAdd(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const domain = (args._[0] || args.domain || '').trim().toLowerCase();
  if (!domain) throw new Error('usage: tsk domains:add app.example.com');
  out(`  Attaching ${bold(domain)} to ${bold(app.name)}…`);
  const res = await api(`/api/cloud/v1/sites/${app.id}/domains`, {
    method: 'POST',
    body: { domain },
  });
  out(`  ${green('Attached.')} status=${res.status || res.sslStatus || 'pending'}`);
  const records = res.records || [];
  if (records.length) {
    out(`  ${yellow('Add these DNS records:')}`);
    for (const r of records) {
      out(`    ${r.type.padEnd(5)} ${r.name} → ${cyan(r.value)}`);
    }
    out(`  Then: ${dim(`tsk domains:verify ${domain}`)}`);
  } else if (res.managed) {
    out(`  ${dim('Platform-managed zone — no DNS for you to add.')}`);
  }
  out();
}

export async function domainsRemove(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const domain = (args._[0] || args.domain || '').trim().toLowerCase();
  if (!domain) throw new Error('usage: tsk domains:remove app.example.com');
  await api(`/api/cloud/v1/sites/${app.id}/domains`, {
    method: 'DELETE',
    body: { domain },
  });
  out(`  ${green('Removed')} ${bold(domain)} from ${bold(app.name)}.`);
}

export async function domainsVerify(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const domain = (args._[0] || args.domain || '').trim().toLowerCase();
  if (!domain) throw new Error('usage: tsk domains:verify app.example.com');
  const res = await api(`/api/cloud/v1/sites/${app.id}/domains/verify`, {
    method: 'POST',
    body: { domain },
  });
  out();
  out(`  ${bold(domain)}`);
  out(`  DNS   ${res.dns?.ok ? green('ok') : yellow(res.dns?.state || 'pending')}`);
  out(`  SSL   ${res.active || res.ssl === 'active' ? green(res.ssl || 'active') : yellow(res.ssl || res.status || 'pending')}`);
  out(`  Live  ${res.active ? green('yes') : yellow('not yet')}`);
  out();
}

function summarizeDns(records) {
  if (!records?.length) return dim('—');
  const bad = records.filter((r) => r.state && r.state !== 'ok' && r.state !== 'active').length;
  if (bad === 0) return green('ok');
  return yellow(`${bad} pending`);
}
