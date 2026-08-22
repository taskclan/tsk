/**
 * The engine, over HTTP.
 *
 * Every call carries the account key as a bearer. The key IS the org scope —
 * the engine ignores an org header when a key authenticates — so the CLI never
 * has to track which workspace it is talking to.
 */
import { apiBase, loadKey } from './config.js';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

/** A signed-in request. Throws ApiError with the engine's own words. */
export async function api(path, { method = 'GET', body, key } = {}) {
  const token = key ?? loadKey();
  if (!token) throw new ApiError('not signed in — run `tsk login`', 401);
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    // The engine's message beats a generic one: it says WHICH role cannot
    // deploy, or that the app does not exist, and the user can act on that.
    throw new ApiError(parsed?.error || `the API responded ${res.status}`, res.status);
  }
  return parsed;
}

/** Unauthenticated — the device flow runs before there is a key. */
export async function publicPost(path, body) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  return { ok: res.ok, status: res.status, body: parsed };
}

/** The apps in this workspace, however the endpoint chooses to wrap them. */
export async function listApps() {
  const data = await api('/api/cloud/v1/sites');
  const sites = Array.isArray(data) ? data : (data.sites ?? []);
  return Array.isArray(sites) ? sites : [];
}

/**
 * Resolve an app name to its record.
 *
 * Names are what people type and ids are what the API takes. Resolving by name
 * also means a typo fails here, naming what does exist, rather than as a 404
 * from a route that cannot know what was meant.
 */
export function pickApp(list, name) {
  if (!name) {
    if (list.length === 1) return list[0];
    throw new ApiError(
      list.length === 0
        ? 'this workspace has no apps yet'
        : `more than one app here — pass --app (${list.map((s) => s.name).join(', ')})`,
      400,
    );
  }
  const hit = list.find((s) => s.name === name || s.id === name);
  if (hit) return hit;
  throw new ApiError(
    list.length ? `no app called "${name}" — this workspace has ${list.map((s) => s.name).join(', ')}` : `no app called "${name}"`,
    404,
  );
}

export async function resolveApp(name) {
  return pickApp(await listApps(), name);
}
