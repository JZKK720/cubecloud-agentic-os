import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  convertFileToMarkdown,
  isMarkitdownAvailable,
  type DocumentConverter,
  type DocumentConverterOutcome,
} from "../src/main/converters";

const HOME = mkdtempSync(join(tmpdir(), "converters-test-"));

vi.mock("../src/main/utils", () => ({
  HERMES_HOME: "/tmp",
  profileHome: () => HOME,
  getEnhancedPath: () => process.env.PATH || "",
}));

// Stub the agent-clis module so `resolveCommandOnPath` is
// predictable. We control whether `markitdown` "exists on PATH"
// per test by toggling the stub's return value.
const resolveCommandMock = vi.fn<
  [string, string],
  string | null
>(() => null);
vi.mock("../src/main/agent-clis", () => ({
  resolveCommandOnPath: (cmd: string, env: string) =>
    resolveCommandMock(cmd, env),
}));

describe("convertFileToMarkdown (file_to_markdown tool)", () => {
  beforeEach(() => {
    if (existsSync(HOME)) {
      rmSync(HOME, { recursive: true, force: true });
    }
    mkdirSync(HOME, { recursive: true });
    resolveCommandMock.mockReset();
    resolveCommandMock.mockReturnValue(null);
  });

  afterEach(() => {
    if (existsSync(HOME)) {
      rmSync(HOME, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it("rejects empty file paths", async () => {
    const res: DocumentConverterOutcome = await convertFileToMarkdown("");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.permanent).toBe(true);
      expect(res.error).toMatch(/no file path/i);
    }
  });

  it("rejects paths that do not exist on disk", async () => {
    const res = await convertFileToMarkdown(join(HOME, "missing.md"));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.permanent).toBe(true);
      expect(res.error).toMatch(/does not exist/i);
    }
  });

  it("returns the markdown of a plain .txt file via the builtin converter", async () => {
    const txt = join(HOME, "notes.txt");
    writeFileSync(txt, "hello world\nfrom the agent", "utf-8");
    const res = await convertFileToMarkdown(txt);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.markdown).toBe("hello world\nfrom the agent");
      expect(res.result.converter).toBe("builtin-text");
      expect(res.result.metadata.bytes).toBe(
        "hello world\nfrom the agent".length,
      );
    }
  });

  it("converts a .json file to a fenced markdown block", async () => {
    const json = join(HOME, "data.json");
    writeFileSync(json, JSON.stringify({ a: 1, b: [1, 2] }), "utf-8");
    const res = await convertFileToMarkdown(json);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.converter).toBe("builtin-json");
      expect(res.result.markdown).toContain("```json");
      expect(res.result.markdown).toContain('"a": 1');
    }
  });

  it("converts a .csv file to a markdown table with header + rows", async () => {
    const csv = join(HOME, "table.csv");
    writeFileSync(csv, "name,age\nalice,30\nbob,25\n", "utf-8");
    const res = await convertFileToMarkdown(csv);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.converter).toBe("builtin-csv");
      const md = res.result.markdown;
      expect(md).toContain("| name | age |");
      expect(md).toContain("| --- | --- |");
      expect(md).toContain("| alice | 30 |");
      expect(md).toContain("| bob | 25 |");
      expect(res.result.metadata).toMatchObject({ rows: 2, columns: 2 });
    }
  });

  it("converts a .csv cell with a quoted comma correctly", async () => {
    const csv = join(HOME, "quoted.csv");
    writeFileSync(csv, 'name,note\n"alice","hi, world"\n', "utf-8");
    const res = await convertFileToMarkdown(csv);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.markdown).toContain("| alice | hi, world |");
    }
  });

  it("converts a tiny .html file to markdown", async () => {
    const html = join(HOME, "page.html");
    writeFileSync(
      html,
      "<html><body><h1>Title</h1><p>Hello <b>world</b>.</p></body></html>",
      "utf-8",
    );
    const res = await convertFileToMarkdown(html);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.converter).toBe("builtin-html");
      expect(res.result.markdown).toMatch(/# Title/);
      expect(res.result.markdown).toContain("Hello world.");
    }
  });

  it("reports a permanent error when no converter accepts the file", async () => {
    const bin = join(HOME, "blob.bin");
    writeFileSync(bin, "binary", "utf-8");
    const res = await convertFileToMarkdown(bin);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.permanent).toBe(true);
      expect(res.error).toMatch(/no converter/i);
    }
  });

  it("uses a custom chain when one is provided (test-only override)", async () => {
    const fake: DocumentConverter = {
      name: "fake",
      accepts: () => true,
      convert: async () => ({
        markdown: "# from-fake",
        metadata: { source: "fake" },
        converter: "fake",
      }),
    };
    const bin = join(HOME, "blob.bin");
    writeFileSync(bin, "binary", "utf-8");
    const res = await convertFileToMarkdown(bin, { chain: [fake] });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result.converter).toBe("fake");
      expect(res.result.markdown).toBe("# from-fake");
    }
  });

  it("isMarkitdownAvailable returns false when the CLI is missing", () => {
    resolveCommandMock.mockReturnValue(null);
    expect(isMarkitdownAvailable()).toBe(false);
  });

  it("isMarkitdownAvailable returns true when resolveCommandOnPath finds it", () => {
    resolveCommandMock.mockImplementation(
      (cmd) => (cmd === "markitdown" ? "/usr/bin/markitdown" : null),
    );
    expect(isMarkitdownAvailable()).toBe(true);
  });
});
