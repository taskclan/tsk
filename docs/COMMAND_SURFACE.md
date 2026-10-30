# tsk command surface

Decision for TAS-1328. Written 2026-10-30.

## Scope

**v1 drives Taskclan Cloud only** — apps, deploys, env, databases, domains, logs, git connect.

Intelligence runs, Studio projects, and T1 calls stay on `@taskclan/sdk` / `@taskclan/mcp`. A later CLI that unifies the platform can absorb those verbs; inventing them here would lock a surface we cannot support yet.

Feel: **Heroku + Vercel**. Short verbs, `--app` or a linked directory, CI via env token, never print secrets unless asked.

## Auth and config

| | |
|---|---|
| Credentials | Device login → macOS keychain, else `~/.taskclan/config.json` (0600). |
| CI | `TASKCLAN_API_KEY` or `TASKCLAN_CLOUD_API_KEY` wins over stored keys. Never write the env key to disk. |
| Linked project | `.taskclan/config.json` in the repo: `{ "app": "name", "appId": "…" }`. Safe to commit. No secrets. |
| Global config | `~/.taskclan/config.json` — apiBase, consoleBase, keyStore. Not committed. |

`tsk config` prints the resolved api base, linked app, and key source (`env` \| `keychain` \| `file` \| `none`) without printing the key.

## Core verbs

| Command | Success | Failure |
|---|---|---|
| `tsk login` | Key stored; prints where. | Browser / device flow failed. |
| `tsk logout` | Key forgotten. | — |
| `tsk whoami` | Workspace + actor. | Not signed in. |
| `tsk apps` | Table of apps. | Unauthorized. |
| `tsk apps:create NAME` | App created; next steps. | Name taken / invalid. |
| `tsk link [--app NAME]` | Writes `.taskclan/config.json`. | App missing. |
| `tsk unlink` | Removes local link. | — |
| `tsk deploy [--app] [--ref] [--stage] [--plan] [--detach]` | Polls until ready; exit 0. | Build failed → exit 1. |
| `tsk logs [--tail] [--app]` | Streams logs. | App missing. |
| `tsk ps` / `tsk ps:scale` | Formation shown / updated. | Role / app. |
| `tsk releases` / `tsk releases:rollback` | History / previous live. | Nothing to roll. |
| `tsk env` / `tsk env:set` / `tsk env:unset` | List (secrets masked) / set / remove. | Role cannot write. |
| `tsk db` / `tsk db:create` / `tsk db:attach` / `tsk db:detach` | List without URLs by default; provision Neon/Supabase/Redis. | Provider not configured. |
| `tsk git:connect owner/repo` | Repo linked; deploy on push to that branch. | No GitHub App install. |
| `tsk git:remote [--add] [--rotate]` | Prints `https://cloud.taskclan.com/git/<sub>.git`; `--add` mints a deploy token and runs `git remote add cloud`. | No subdomain / role. |
| `tsk domains` / `domains:add` / `domains:remove` / `domains:verify` | List + DNS checklist; attach; detach; re-check. | Role / invalid host. |
| `tsk open` / `tsk open:console` | Opens live URL / console in the browser. | No live URL yet. |

`--app` is optional when exactly one app exists in the workspace **or** the cwd is linked.

## Deploying branches and stages

Three supported paths (pick one):

1. **Cloud git remote (Heroku-style):** `tsk git:remote --add` then `git push cloud main` (or `git push cloud feature:main`).
2. **GitHub App:** `tsk git:connect owner/repo` — pushes to that GitHub branch deploy via webhook.
3. **Explicit ref:** `tsk deploy --ref feature/foo` / `--stage staging` for pipeline siblings.

## Explicit non-goals (v1)

- Uploading a local working tree as the release source (irreproducible).
- Driving Intelligence / Studio / T1.
- Printing secret env values without `--reveal` (and a role that may).
