import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { writeWikiRawSource, listWikiSources } from "../src/main/wiki";

const HOME = mkdtempSync(join(tmpdir(), "wiki-raw-test-"));

vi.mock("../src/main/utils", () => ({
  HERMES_HOME: "/tmp",
  profileHome: () => HOME,
  safeWriteFile: (filePath: string, content: string) => {
    // Mirror the real safeWriteFile: create the parent dir then write.
    // We do not import the path module here to keep the mock simple,
    // but on Windows the path module's dirname works fine and we can
    // call it from the test directly below.
    const dir = filePath.replace(/[\\/][^\\/]*$/, "");
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, content, "utf-8");
  },
}));

describe("writeWikiRawSource (file_to_markdown ingest target)", () => {
  beforeEach(() => {
    if (existsSync(HOME)) {
      rmSync(HOME, { recursive: true, force: true });
    }
    mkdirSync(HOME, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(HOME)) {
      rmSync(HOME, { recursive: true, force: true });
    }
  });

  it("writes the markdown under raw/sources/ and returns the relPath", () => {
    const r = writeWikiRawSource("notes.md", "# hello\n", undefined);
    expect(r.relPath).toBe("wiki/raw/sources/notes.md");
    expect(r.size).toBe("# hello\n".length);
    const full = join(HOME, r.relPath);
    expect(existsSync(full)).toBe(true);
    expect(readFileSync(full, "utf-8")).toBe("# hello\n");
  });

  it("sanitizes unsafe filenames and defaults to .md when none given", () => {
    const r1 = writeWikiRawSource("../etc/passwd", "x", undefined);
    expect(r1.relPath).toBe("wiki/raw/sources/passwd.md");
    const r2 = writeWikiRawSource("", "x", undefined);
    expect(r2.relPath).toBe("wiki/raw/sources/untitled.md");
    const r3 = writeWikiRawSource("C:\\Users\\me\\file.md", "x", undefined);
    expect(r3.relPath).toBe("wiki/raw/sources/file.md");
  });

  it("uniquifies when the file already exists", () => {
    const a = writeWikiRawSource("dup.md", "first", undefined);
    const b = writeWikiRawSource("dup.md", "second", undefined);
    expect(a.relPath).toBe("wiki/raw/sources/dup.md");
    expect(b.relPath).toBe("wiki/raw/sources/dup-1.md");
    expect(readFileSync(join(HOME, a.relPath), "utf-8")).toBe("first");
    expect(readFileSync(join(HOME, b.relPath), "utf-8")).toBe("second");
  });

  it("appears in listWikiSources after a write", () => {
    writeWikiRawSource("a.md", "alpha", undefined);
    writeWikiRawSource("b.md", "beta", undefined);
    const list = listWikiSources();
    expect(list.total).toBe(2);
    const names = list.items.map((s) => s.name).sort();
    expect(names).toEqual(["a.md", "b.md"]);
  });
});
