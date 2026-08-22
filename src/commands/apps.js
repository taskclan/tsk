import { listApps } from '../api.js';
import { bold, dim, out, table } from '../ui.js';

/**
 * The address a person would actually open.
 *
 * An app can have a custom domain, a managed subdomain and an internal host,
 * and they are not interchangeable — printing the internal host to somebody
 * who asked where their app is sends them to the wrong door.
 */
export function appUrl(site) {
  if (site.customDomain) return `https://${site.customDomain}`;
  if (site.liveUrl) return site.liveUrl;
  if (site.host) return `https://${site.host}`;
  return '';
}

/** `tsk apps` — what this key can reach. */
export async function apps() {
  const list = await listApps();
  if (list.length === 0) {
    out(dim('  No apps in this workspace yet.'));
    return;
  }
  out();
  table([
    [bold('NAME'), bold('STATUS'), bold('LAST DEPLOY'), bold('URL')],
    ...list.map((s) => [s.name, s.status ?? '', s.deployStatus ?? '', appUrl(s)]),
  ]);
  out();
}
