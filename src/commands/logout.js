import { clearKey } from '../config.js';
import { green, out } from '../ui.js';

/** Forget the key on this machine. The key itself is revoked in the console. */
export async function logout() {
  clearKey();
  out(`  ${green('Signed out.')} The key is gone from this machine; revoke it in the console to kill it everywhere.`);
}
