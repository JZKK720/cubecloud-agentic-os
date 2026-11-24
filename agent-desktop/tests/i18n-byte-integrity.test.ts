import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Byte-level integrity of the locale dictionaries.
//
// The earlier mojibake checks looked for U+FFFD and CP1252 artefacts.
// Neither sees the class that actually shipped: UTF-8 bytes decoded as
// GBK and re-saved as UTF-8. The result is *valid* UTF-8 with zero
// replacement characters, so `ja/common.ts` could hold
//
//   save: "淇濆瓨",   // 保存
//   search: "妞滅储", // 検索
//
// and every gate reported clean. `scripts/check-mojibake.cjs` grew a
// round-trip check for Markdown; the locale tree had none, which is why
// 22 keys in `ja` and 1 in `zh-CN` survived the "repair" commit 3aa28d4.
//
// These assertions read raw bytes. They are deliberately precise — a
// false positive here means rewriting correct copy, which is worse than
// missing a case.

const localesRoot = resolve(__dirname, "..", "src", "shared", "i18n", "locales");

function localeFiles(): string[] {
  const out: string[] = [];
  for (const lang of readdirSync(localesRoot, { withFileTypes: true })) {
    if (!lang.isDirectory()) continue;
    const dir = join(localesRoot, lang.name);
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".ts")) out.push(join(dir, file));
    }
  }
  return out;
}

// Reverse map for cp936: single character -> the two bytes GBK encodes
// it to. Built from ICU's own decoder, so no iconv dependency.
let cp936: Map<string, [number, number]> | null = null;
function cp936Reverse(): Map<string, [number, number]> {
  if (cp936) return cp936;
  const decoder = new TextDecoder("gbk");
  cp936 = new Map();
  for (let hi = 0x81; hi <= 0xfe; hi++) {
    for (let lo = 0x40; lo <= 0xfe; lo++) {
      if (lo === 0x7f) continue;
      let decoded: string;
      try {
        decoded = decoder.decode(Buffer.from([hi, lo]));
      } catch {
        continue;
      }
      if (decoded.length === 1 && decoded !== "\uFFFD" && !cp936.has(decoded)) {
        cp936.set(decoded, [hi, lo]);
      }
    }
  }
  return cp936;
}

// Ranges that only occur in text that was never meant to be read as
// kana/han. A round-trip result made of these is a mis-decode artefact,
// not plausible copy.
const IMPLAUSIBLE = /[\u0300-\u036f\u0480-\u04ff\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20f0\u0080-\u00ff]/;
const CJK =
  /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uff01-\uff60\u2010-\u2027]/;

// A run of characters that all encode losslessly to cp936 and whose
// bytes decode as valid UTF-8 with no replacement characters is the
// signature of `utf8 -> gbk -> utf8`. `停止` reverses to `\u0363\u05b9`,
// which is implausible, so it is correctly left alone.
function mojibakeRuns(text: string): string[] {
  const map = cp936Reverse();
  const found: string[] = [];
  let run: string[] = [];

  const settle = () => {
    if (run.length >= 2) {
      const bytes: number[] = [];
      for (const ch of run) bytes.push(...map.get(ch)!);
      let reversed = "";
      try {
        reversed = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(bytes));
      } catch {
        reversed = "";
      }
      if (reversed && !IMPLAUSIBLE.test(reversed) && CJK.test(reversed)) {
        found.push(`${run.join("")} -> ${reversed}`);
      }
    }
    run = [];
  };

  for (const ch of text) {
    if (ch.charCodeAt(0) > 127 && map.has(ch)) run.push(ch);
    else settle();
  }
  settle();

  return found;
}

function valuesOf(text: string): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const re = /^\s{2}([A-Za-z_$][\w$]*):\s*"((?:[^"\\]|\\.)*)",?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ key: m[1], value: m[2] });
  return out;
}

describe("locale byte integrity", () => {
  it("every locale file is valid UTF-8 with no BOM and no U+FFFD", () => {
    const bad: string[] = [];

    for (const file of localeFiles()) {
      const rel = relative(localesRoot, file).replace(/\\/g, "/");
      const bytes = readFileSync(file);

      if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        bad.push(`${rel}: UTF-8 BOM`);
        continue;
      }

      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        bad.push(`${rel}: not valid UTF-8`);
        continue;
      }

      if (text.includes("\uFFFD")) bad.push(`${rel}: contains U+FFFD`);
    }

    expect(bad).toEqual([]);
  });

  it("no locale value is UTF-8 that was decoded as GBK and re-saved", () => {
    const bad: string[] = [];

    for (const file of localeFiles()) {
      const rel = relative(localesRoot, file).replace(/\\/g, "/");
      const text = readFileSync(file, "utf8");
      for (const { key, value } of valuesOf(text)) {
        for (const run of mojibakeRuns(value)) bad.push(`${rel}: ${key} = ${run}`);
      }
    }

    expect(bad.sort()).toEqual([]);
  });
});
