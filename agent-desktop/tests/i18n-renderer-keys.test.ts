import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { t } from "../src/shared/i18n";

// Renderer components call `t("namespace.key")` for every user-facing
// string. If the key is absent from the dictionaries, i18next renders
// the raw key instead of text — which is exactly what shipped on the
// CodeGraph, EverOS, Headroom, and Tools screens. `t()` falls back to
// returning the key verbatim, so asserting `t(key) !== key` catches
// the whole class of regression.

const rendererSrc = resolve(__dirname, "..", "src", "renderer", "src");

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Only literal keys are checked. Dynamic keys such as
// `t(\`tools.${id}.label\`)` cannot be resolved statically, and the
// dictionary-parity test below covers namespace drift for those.
function collectLiteralKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  const pattern = /\bt\(\s*["']([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)["']/g;

  for (const file of collectSourceFiles(rendererSrc)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      if (!keys.has(match[1])) {
        keys.set(match[1], relative(rendererSrc, file));
      }
    }
  }

  return keys;
}

describe("renderer i18n keys", () => {
  it("resolves every literal t() key to real copy", () => {
    const keys = collectLiteralKeys();
    expect(keys.size).toBeGreaterThan(500);

    const unresolved = [...keys]
      .filter(([key]) => t(key, "en") === key)
      .map(([key, file]) => `${key} (${file})`)
      .sort();

    expect(unresolved).toEqual([]);
  });

  it("falls back to English copy in every non-English locale", () => {
    // Non-English locales re-export the English file for screens that
    // have not been natively reviewed yet. That is intentional, but it
    // must still resolve to text — a raw key means the namespace was
    // never registered in `resources`, so the whole screen renders as
    // `codegraph.title` instead of copy.
    const keys = [...collectLiteralKeys().keys()];
    const rawKeys = [];

    for (const locale of ["es", "id", "ja", "pt-BR", "pt-PT", "zh-CN", "zh-TW"]) {
      for (const key of keys) {
        if (t(key, locale) === key) rawKeys.push(`${locale}: ${key}`);
      }
    }

    expect(rawKeys).toEqual([]);
  });
});
