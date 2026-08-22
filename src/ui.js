/** Terminal output. Colour only when someone is watching. */
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : String(s));

export const dim = wrap('2');
export const bold = wrap('1');
export const green = wrap('32');
export const red = wrap('31');
export const yellow = wrap('33');
export const cyan = wrap('36');

export const out = (s = '') => process.stdout.write(`${s}\n`);
export const err = (s = '') => process.stderr.write(`${s}\n`);

/** Columns aligned on the longest cell, last column left ragged. */
export function table(rows) {
  if (rows.length === 0) return;
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_, i) => Math.max(...rows.map((r) => String(r[i] ?? '').length)));
  for (const r of rows) {
    out(r.map((c, i) => String(c ?? '').padEnd(i === r.length - 1 ? 0 : widths[i] + 2)).join('').trimEnd());
  }
}

export function fail(message, code = 1) {
  err(`${red('x')} ${message}`);
  process.exit(code);
}
