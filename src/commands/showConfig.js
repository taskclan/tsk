/**
 * `tsk config` — resolved settings without printing secrets.
 */
import { apiBase, consoleBase, keySource, configPath } from '../config.js';
import { readProject, projectConfigPath } from '../project.js';
import { bold, dim, out, table } from '../ui.js';

export async function showConfig() {
  const linked = readProject();
  const source = keySource();
  out();
  table([
    [bold('SETTING'), bold('VALUE')],
    ['api', apiBase()],
    ['console', consoleBase()],
    ['key source', source],
    ['global config', configPath()],
    ['linked app', linked?.app || dim('(none)')],
    ['linked id', linked?.appId || dim('(none)')],
    ['project file', linked ? projectConfigPath() : dim('(none)')],
  ]);
  out();
  if (source === 'none') out(`  ${dim('Not signed in — run `tsk login` or set TASKCLAN_API_KEY.')}`);
}
