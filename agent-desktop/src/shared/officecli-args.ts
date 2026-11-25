// officecli-args.ts — split an OfficeCLI argument string into argv.
//
// The Tools screen accepts free text ("--out ./report.html --title "Q3 report"").
// A naive /\s+/ split breaks quoted values that contain spaces and JSON
// payloads like --data '{"client":"Acme Co"}'.
//
// Backslash rules, chosen so Windows paths survive on Windows and remain
// usable in POSIX shells:
//   - outside quotes and inside double quotes, a backslash that precedes a
//     character which can end or escape the token (" / \\ space) escapes it;
//   - any other backslash is kept verbatim (so C:\\Users\\me stays
//     C:\\Users\\me);
//   - inside single quotes, backslashes are literal, always.
// An unterminated quote is an error, not silent mangling.

export type SplitArgsResult =
  | { ok: true; args: string[] }
  | { ok: false; error: string };

export function splitShellArgs(input: string): SplitArgsResult {
  const args: string[] = [];
  let cur = "";
  let has = false; // distinguishes "" (empty arg) from "no chars yet"
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const ch of input) {
    if (escaped) {
      // Keep a backslash when it does not introduce a meaningful escape:
      // \\\\ \\" \\' and \\<whitespace> are escapes; anything else is a literal
      // Windows path separator and must survive (C:\\Users\\me).
      const isEscape =
        ch === '\\' || ch === '"' || ch === "'" || /\s/.test(ch);
      cur += isEscape ? ch : "\\" + ch;
      has = true;
      escaped = false;
      continue;
    }
    if (quote === "'") {
      if (ch === "'") {
        quote = null;
      } else {
        cur += ch;
        has = true;
      }
      continue;
    }
    if (quote === '"') {
      if (ch === '"') {
        quote = null;
      } else if (ch === "\\") {
        escaped = true;
      } else {
        cur += ch;
        has = true;
      }
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (has) {
        args.push(cur);
        cur = "";
        has = false;
      }
      continue;
    }
    cur += ch;
    has = true;
  }

  if (escaped) cur += "\\";
  if (quote) return { ok: false, error: `unterminated ${quote} quote` };
  if (has) args.push(cur);
  return { ok: true, args };
}
