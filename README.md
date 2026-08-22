# tsk — Taskclan Cloud CLI

Deploy, scale, tail logs and roll back from the terminal.

```
brew install taskclan/tap/tsk
tsk login
tsk deploy --app my-app
```

## Commands

| | |
|---|---|
| `tsk login` | Authorise this machine in a browser. The key goes to your keychain, never to stdout. |
| `tsk apps` | The apps this key can reach. |
| `tsk deploy --app NAME` | Build and release the app's connected repository. |
| `tsk logs --tail --app NAME` | Stream logs from every container. |
| `tsk ps --app NAME` | What the formation looks like. |
| `tsk ps:scale web=3 --app NAME` | Change the formation without a rebuild. |
| `tsk releases --app NAME` | Deployment history. |
| `tsk releases:rollback --app NAME` | Back to the previous release, no rebuild. |
| `tsk whoami` | Which workspace this key belongs to. |
| `tsk logout` | Forget the key on this machine. |

`--app` can be omitted when the workspace has exactly one app.

## Where your credentials live

`tsk login` runs the OAuth device flow: the browser authenticates you, and the
CLI receives a key minted for this machine which can be revoked on its own from
**Console → Team & access**.

On macOS the key is stored in the login keychain. Elsewhere it goes to
`~/.taskclan/config.json` with mode 0600. It is never printed — a token echoed
into a terminal ends up in scrollback and in the screenshot somebody pastes
into an issue.

## Environment

| | |
|---|---|
| `TASKCLAN_API_URL` | Point the CLI at a different engine (default `https://engine.taskclan.com`). |
| `TASKCLAN_CONSOLE_URL` | Where `tsk login` sends the browser. |
| `NO_COLOR` | Disable colour. |

## Requirements

Node 20 or newer. The Homebrew formula installs one for you.
