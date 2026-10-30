/**
 * `tsk link` / `tsk unlink` — associate cwd with a Cloud app.
 */
import { resolveApp } from '../api.js';
import { writeProject, clearProject, readProject, projectConfigPath } from '../project.js';
import { bold, dim, green, out } from '../ui.js';

export async function link(args) {
  const app = await resolveApp(args.app || args._[0]);
  writeProject({ app: app.name, appId: app.id });
  out(`  Linked ${bold(app.name)} → ${dim(projectConfigPath())}`);
  out(`  ${dim('Safe to commit. Secrets stay in the keychain / TASKCLAN_API_KEY.')}`);
}

export async function unlink() {
  const was = readProject();
  clearProject();
  out(was ? `  Unlinked ${bold(was.app || was.appId)}.` : `  ${dim('Nothing was linked.')}`);
  out(`  ${green('Done.')}`);
}
