/**
 * Argument parsing.
 *
 * Small enough to own rather than depend on: the formula installs this with no
 * npm install step, which means every dependency is a file somebody has to
 * vendor and audit. Nothing here is worth that.
 */

/** `--app x`, `--app=x`, `-a x`, `--tail`, and everything else positional. */
export function parseArgs(argv, aliases = { a: 'app', h: 'help', v: 'version' }) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--') { out._.push(...argv.slice(i + 1)); break; }
    if (token.startsWith('--')) {
      const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s);
      const key = rawKey;
      if (inlineValue !== undefined) { out[key] = inlineValue; continue; }
      const next = argv[i + 1];
      // A flag followed by another flag is a boolean, not a flag whose value
      // is the next flag — `--tail --app x` must not read as tail="--app".
      if (next === undefined || next.startsWith('-')) { out[key] = true; continue; }
      out[key] = next; i += 1;
      continue;
    }
    if (token.startsWith('-') && token.length > 1) {
      const key = aliases[token.slice(1)] ?? token.slice(1);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) { out[key] = true; continue; }
      out[key] = next; i += 1;
      continue;
    }
    out._.push(token);
  }
  return out;
}

/**
 * What a leading token means, when it is a flag rather than a command.
 *
 * `parseArgs` already understands `-h` and `-v`, but only for tokens after the
 * command: the CLI takes `argv[0]` as the command name and parses the rest. So
 * `tsk deploy --help` worked and `tsk --help` answered `no command "--help"`,
 * which is the form people actually type first. `--version` happened to work
 * only because it was special-cased by name, and `-v` and `-h` were not — three
 * spellings of the same two intentions, two of them wrong.
 *
 * Returns 'help', 'version', or null when the token is a real command.
 */
export function leadingIntent(name) {
  if (!name) return 'help';
  if (name === 'help' || name === '--help' || name === '-h') return 'help';
  if (name === 'version' || name === '--version' || name === '-v' || name === '-V') return 'version';
  return null;
}
