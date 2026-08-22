/**
 * `tsk logs` — runtime logs, optionally followed.
 *
 * Streams the same endpoint the console's live tail reads. A bearer token
 * cannot be attached to an EventSource, which is why this is a plain fetch
 * over the body rather than the obvious SSE client.
 */
import { apiBase, loadKey } from '../config.js';
import { ApiError, resolveApp } from '../api.js';
import { dim, out } from '../ui.js';

export async function logs(args) {
  const app = await resolveApp(args.app);
  const key = loadKey();
  if (!key) throw new ApiError('not signed in — run `tsk login`', 401);

  const url = `${apiBase()}/api/cloud/v1/sites/${app.id}/runtime-logs/stream`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'text/event-stream' } });
  if (!res.ok || !res.body) {
    throw new ApiError(`could not open the log stream (${res.status})`, res.status);
  }
  out(dim(`  Tailing ${app.name} — ctrl-c to stop`));

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) {
      const text = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
      if (!text) continue;
      try {
        const ev = JSON.parse(text);
        out(ev.message ?? ev.line ?? text);
      } catch {
        out(text);
      }
    }
    if (!args.tail && !args.follow) break;
  }
}
