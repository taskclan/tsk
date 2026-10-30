/**
 * `tsk logs` — runtime logs, optionally followed across container rolls.
 *
 * The engine ends the SSE stream when the Cloudflare tail session closes
 * (redeploy, timeout). Follow mode reconnects with backoff instead of exiting.
 */
import { apiBase, loadKey } from '../config.js';
import { ApiError, resolveApp } from '../api.js';
import { dim, out, yellow } from '../ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function logs(args) {
  const app = await resolveApp(args.app, { stage: args.stage });
  const key = loadKey();
  if (!key) throw new ApiError('not signed in — run `tsk login`', 401);

  const follow = !!(args.tail || args.follow);
  const filter = (args.filter || args.contains || '').toString().toLowerCase();
  const severity = (args.severity || args.level || '').toString().toLowerCase();

  out(dim(`  Tailing ${app.name}${follow ? ' (reconnects on roll)' : ''} — ctrl-c to stop`));

  let attempt = 0;
  for (;;) {
    try {
      await streamOnce(app.id, key, { filter, severity });
      attempt = 0;
    } catch (e) {
      if (!follow) throw e;
      attempt += 1;
      const wait = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 4));
      out(dim(`  ${yellow('stream ended')} — reconnecting in ${Math.round(wait / 1000)}s…`));
      await sleep(wait);
      continue;
    }
    if (!follow) return;
    attempt += 1;
    const wait = Math.min(15_000, 1500 * attempt);
    out(dim(`  reconnecting in ${Math.round(wait / 1000)}s…`));
    await sleep(wait);
  }
}

async function streamOnce(siteId, key, { filter, severity }) {
  const url = `${apiBase()}/api/cloud/v1/sites/${siteId}/runtime-logs/stream`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'text/event-stream' } });
  if (!res.ok || !res.body) {
    throw new ApiError(`could not open the log stream (${res.status})`, res.status);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
        continue;
      }
      if (line.startsWith(':')) continue; // comment / keepalive
      const text = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
      if (!text) {
        eventName = 'message';
        continue;
      }
      if (eventName === 'end' || eventName === 'error') {
        eventName = 'message';
        return; // let follow mode reconnect
      }
      let message = text;
      let level = '';
      try {
        const ev = JSON.parse(text);
        message = ev.message ?? ev.line ?? ev.logs?.[0]?.message ?? text;
        level = String(ev.level || ev.severity || '').toLowerCase();
      } catch { /* plain text */ }
      if (severity && level && !level.includes(severity)) continue;
      if (filter && !String(message).toLowerCase().includes(filter)) continue;
      out(message);
      eventName = 'message';
    }
  }
}
