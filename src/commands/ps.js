/**
 * `tsk ps` and `tsk ps:scale web=3`.
 *
 * Scaling is a ceiling, not a fixed count — the platform autoscales up to it —
 * so the output says "up to N" rather than implying N containers are running.
 */
import { api, resolveApp } from '../api.js';
import { bold, green, out, table, dim } from '../ui.js';
import { ApiError } from '../api.js';

export async function ps(args) {
  const app = await resolveApp(args.app);
  const f = await api(`/api/cloud/v1/sites/${app.id}/formation`);
  const procs = f.processes ?? (f.quantity != null ? [{ type: 'web', quantity: f.quantity, instanceType: f.instanceType }] : []);
  if (procs.length === 0) { out(dim('  No process types reported.')); return; }
  out();
  table([[bold('PROCESS'), bold('UP TO'), bold('SIZE')],
    ...procs.map((p) => [p.type ?? 'web', String(p.quantity ?? ''), p.instanceType ?? ''])]);
  out();
}

/** Parses `web=3`. Only the web process can scale today; say so rather than 400. */
export function parseScale(pairs) {
  const out = {};
  for (const raw of pairs) {
    const m = /^([a-z][a-z0-9_-]*)=(\d+)$/i.exec(raw.trim());
    if (!m) throw new ApiError(`could not read "${raw}" — expected something like web=3`, 400);
    out[m[1].toLowerCase()] = Number(m[2]);
  }
  if (Object.keys(out).length === 0) throw new ApiError('nothing to scale — try `tsk ps:scale web=2`', 400);
  const unknown = Object.keys(out).filter((k) => k !== 'web');
  if (unknown.length) throw new ApiError(`only the web process can scale here, not ${unknown.join(', ')}`, 400);
  return out;
}

export async function psScale(args) {
  const app = await resolveApp(args.app);
  const parsed = parseScale(args._);
  const res = await api(`/api/cloud/v1/sites/${app.id}/formation`, {
    method: 'PATCH', body: { quantity: parsed.web },
  });
  out(`  ${green('Scaled.')} ${bold(app.name)} web up to ${res.quantity ?? parsed.web}${res.instanceType ? ` on ${res.instanceType}` : ''}.`);
}
