import { api } from '../api.js';
import { bold, dim, out } from '../ui.js';
import { apiBase, readConfig } from '../config.js';

/**
 * `tsk whoami` — which workspace this machine's key belongs to.
 *
 * The key is scoped to ONE workspace: the engine ignores an org header when a
 * key authenticates. So this reports the active org rather than listing every
 * org the human belongs to, which would suggest the CLI can reach them.
 */
export async function whoami() {
  const data = await api('/api/cloud/v1/orgs');
  const orgs = Array.isArray(data?.orgs) ? data.orgs : [];
  const active = orgs.find((o) => o.id === data?.activeOrgId) ?? orgs[0] ?? null;
  out();
  out(`  Workspace  ${bold(active?.name ?? 'unknown')}${active?.plan ? dim(`  ${active.plan}`) : ''}`);
  if (data?.activeRole) out(`  Role       ${data.activeRole}`);
  if (data?.activeUser?.email) out(`  Account    ${data.activeUser.email}`);
  out(`  API        ${apiBase()}`);
  out(`  Key        ${readConfig().keyStore === 'keychain' ? 'in your keychain' : 'in ~/.taskclan/config.json'}`);
  out();
}
