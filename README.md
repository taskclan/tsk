# tsk — Taskclan Cloud CLI

Deploy, scale, provision databases, and manage env from the terminal — Heroku/Vercel-shaped.

```
brew install taskclan/tap/tsk
# or: npm i -g @taskclan/tsk
tsk login
tsk apps:create my-app --link
tsk git:connect owner/repo
tsk deploy
```

## Commands

| | |
|---|---|
| `tsk login` | Authorise this machine in a browser. Key → keychain, never stdout. |
| `tsk apps` | Apps this key can reach. |
| `tsk apps:create NAME` | Provision a service app (`--pipeline`, `--stage`, `--link`). |
| `tsk link --app NAME` | Write `.taskclan/config.json` (safe to commit). |
| `tsk deploy [--ref BRANCH] [--stage staging]` | Build the connected repo (any git ref). |
| `tsk git:connect owner/repo` | Wire GitHub; pushes to that branch deploy. |
| `tsk git:remote --add` | Install `git remote cloud` → `git push cloud main`. |
| `tsk env` / `env:set` / `env:unset` | Config vars (secrets masked). |
| `tsk db` / `db:create` | List or provision Neon / Supabase / Redis. |
| `tsk logs --tail [--filter X]` | Stream logs; reconnects across container rolls. |
| `tsk domains` / `domains:add` | Custom hostnames + DNS records still needed. |
| `tsk open` / `open:console` | Live URL or Cloud console in the browser. |
| `tsk ps` / `ps:scale` | Formation. |
| `tsk releases` | Deployment history; marks ● live. |
| `tsk rollback [id\|commit]` | Instant roll back to the previous (or named) ready release. |
| `tsk config` | Resolved api base, linked app, key source. |
| `tsk whoami` / `tsk logout` | Account. |

`--app` can be omitted when the directory is linked or the workspace has exactly one app.

### Deploy paths

```
tsk git:remote --add              # Heroku-style: mints token, adds remote "cloud"
git push cloud main
git push cloud feature:main       # push a branch as the app's main

tsk git:connect owner/repo        # or: GitHub App webhook on that branch
tsk deploy --ref feature/foo --stage staging
```

Pipeline siblings:

```
tsk apps:create my-app-staging --pipeline my-app --stage staging --link
tsk deploy --ref feature/foo --stage staging
```

### Rollback

```
tsk releases                 # ● live marks the serving build
tsk rollback                 # previous ready release (no rebuild)
tsk rollback a1b2c3d4        # by deployment id prefix
tsk rollback deadbeef        # by commit sha prefix
```

## Credentials

`tsk login` runs the OAuth device flow. On macOS the key is in the login keychain; elsewhere `~/.taskclan/config.json` (0600).

**CI:** set `TASKCLAN_API_KEY` (or `TASKCLAN_CLOUD_API_KEY`). Env wins over the keychain.

Linked projects store only app name/id in `.taskclan/config.json` — commit that file; never put tokens there.

## Environment

| | |
|---|---|
| `TASKCLAN_API_KEY` | CI / script auth (preferred). |
| `TASKCLAN_CLOUD_API_KEY` | Alias for the above. |
| `TASKCLAN_API_URL` | Engine base (default `https://engine.taskclan.com`). |
| `TASKCLAN_CONSOLE_URL` | Where `tsk login` opens the browser. |
| `NO_COLOR` | Disable colour. |

## Requirements

Node 22.23.4 or newer. The Homebrew formula installs one for you.

See [docs/COMMAND_SURFACE.md](docs/COMMAND_SURFACE.md) for the full verb contract.
