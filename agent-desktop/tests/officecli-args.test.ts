import { describe, expect, it } from "vitest";
import { splitShellArgs } from "../src/shared/officecli-args";

describe("splitShellArgs", () => {
  it("splits plain whitespace-separated args", () => {
    const r = splitShellArgs("--page 1-3 --verbose");
    expect(r).toEqual({ ok: true, args: ["--page", "1-3", "--verbose"] });
  });

  it("keeps quoted segments with spaces as one arg", () => {
    const r = splitShellArgs('--out "My Docs/out.html"');
    expect(r).toEqual({ ok: true, args: ["--out", "My Docs/out.html"] });
  });

  it("treats backslash as an escape inside double quotes", () => {
    const r = splitShellArgs('--out "My \\"quoted\\" dir/out.html"');
    expect(r).toEqual({ ok: true, args: ["--out", 'My "quoted" dir/out.html'] });
  });

  it("handles single quotes", () => {
    const r = splitShellArgs("--title 'Q3 report'");
    expect(r).toEqual({ ok: true, args: ["--title", "Q3 report"] });
  });

  it("keeps JSON payloads with spaces intact", () => {
    const r = splitShellArgs('--data \'{"client":"Acme Co"}\'');
    expect(r).toEqual({ ok: true, args: ["--data", '{"client":"Acme Co"}'] });
  });

  it("unescapes backslash-escaped characters outside quotes", () => {
    const r = splitShellArgs("--name Acme\\ Corp");
    expect(r).toEqual({ ok: true, args: ["--name", "Acme Corp"] });
  });

  it("treats backslash literally inside single quotes", () => {
    const r = splitShellArgs("--path 'C:\\Users\\me'");
    expect(r).toEqual({ ok: true, args: ["--path", "C:\\Users\\me"] });
  });

  it("returns an error for an unterminated quote instead of mangling", () => {
    const r = splitShellArgs('--out "C:\\open path');
    expect(r.ok).toBe(false);
  });

  it("keeps a backslash before a non-escape letter (Windows path segment)", () => {
    const r = splitShellArgs("--out C:\\Users\\me\\out.html");
    expect(r).toEqual({ ok: true, args: ["--out", "C:\\Users\\me\\out.html"] });
  });

  it("keeps backslashes inside double quotes when not an escape", () => {
    const r = splitShellArgs('--out "C:\\Users\\me\\My Docs\\out.html"');
    expect(r).toEqual({ ok: true, args: ["--out", "C:\\Users\\me\\My Docs\\out.html"] });
  });

  it("treats backslash-space as an escaped space so the path stays one arg", () => {
    const r = splitShellArgs("--out C:\\My\\ Docs\\out.html");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.args).toEqual(["--out", "C:\\My Docs\\out.html"]);
  });

  it("returns empty args for empty input", () => {
    expect(splitShellArgs("   ")).toEqual({ ok: true, args: [] });
  });

  it("preserves an intentionally empty quoted argument", () => {
    expect(splitShellArgs('--note ""')).toEqual({ ok: true, args: ["--note", ""] });
  });
});
