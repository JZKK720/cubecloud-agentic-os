// officecli-args.ts — split an OfficeCLI argument string into argv.
//
// The Tools screen accepts free text ("--out ./report.html --title "Q3 report"").
// A naive /\s+/ split breaks quoted values that contain spaces and JSON
// payloads like --data '{"client":"Acme Co"}'. This tokenizer honours
// single quotes, double quotes and backslash escapes, and treats an
// unterminated quote as an error instead of silently mangling the input.

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
      cur += ch;
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
