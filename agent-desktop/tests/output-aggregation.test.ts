import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ensureThreadOutputDir,
  listThreadOutputs,
  listAllOutputs,
  clearThreadOutputs,
  summarizeOutputs,
} from "../src/main/output-aggregation";
import * as utils from "../src/main/utils";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";

vi.mock("../src/main/utils", () => ({
  profileHome: vi.fn(() => "/tmp/test-outputs"),
}));

const mockProfileHome = vi.mocked(utils.profileHome);

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "outputs-"));
  mockProfileHome.mockReturnValue(tempDir);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("output-aggregation — ensureThreadOutputDir", () => {
  it("creates the directory if it doesn't exist", () => {
    const dir = ensureThreadOutputDir("thread-1");
    expect(existsSync(dir)).toBe(true);
  });

  it("is idempotent — calling twice doesn't error", () => {
    ensureThreadOutputDir("thread-1");
    const dir2 = ensureThreadOutputDir("thread-1");
    expect(existsSync(dir2)).toBe(true);
  });
});

describe("output-aggregation — listThreadOutputs", () => {
  it("returns empty files when directory doesn't exist", () => {
    const result = listThreadOutputs("nonexistent");
    expect(result.files).toEqual([]);
    expect(result.threadId).toBe("nonexistent");
  });

  it("lists files with metadata", () => {
    const dir = ensureThreadOutputDir("thread-1");
    writeFileSync(join(dir, "report.html"), "<h1>Report</h1>");
    writeFileSync(join(dir, "data.json"), '{"key":"value"}');

    const result = listThreadOutputs("thread-1");

    expect(result.files).toHaveLength(2);
    const html = result.files.find((f) => f.name === "report.html");
    expect(html).toBeDefined();
    expect(html!.mimeType).toBe("text/html");
    expect(html!.sizeBytes).toBeGreaterThan(0);
    expect(html!.extension).toBe(".html");

    const json = result.files.find((f) => f.name === "data.json");
    expect(json!.mimeType).toBe("application/json");
  });

  it("sorts files by modified time descending", () => {
    const dir = ensureThreadOutputDir("thread-2");
    writeFileSync(join(dir, "old.txt"), "old");
    // Small delay to ensure different mtime
    const future = new Date(Date.now() + 1000);
    writeFileSync(join(dir, "new.txt"), "new");
    // Manually set old.txt mtime to past
    const { utimesSync } = require("fs");
    utimesSync(join(dir, "old.txt"), new Date(0), new Date(0));

    const result = listThreadOutputs("thread-2");
    expect(result.files[0].name).toBe("new.txt");
    expect(result.files[1].name).toBe("old.txt");
  });
});

describe("output-aggregation — listAllOutputs", () => {
  it("returns empty when no outputs directory exists", () => {
    const result = listAllOutputs();
    expect(result.threads).toEqual([]);
    expect(result.totalFiles).toBe(0);
  });

  it("lists all threads with their files", () => {
    const dir1 = ensureThreadOutputDir("thread-a");
    writeFileSync(join(dir1, "report.html"), "<h1>A</h1>");
    const dir2 = ensureThreadOutputDir("thread-b");
    writeFileSync(join(dir2, "data.json"), "{}");
    writeFileSync(join(dir2, "slides.pptx"), "fake-pptx");

    const result = listAllOutputs();

    expect(result.threads).toHaveLength(2);
    expect(result.totalFiles).toBe(3);

    const threadA = result.threads.find((t) => t.threadId === "thread-a");
    expect(threadA!.files).toHaveLength(1);

    const threadB = result.threads.find((t) => t.threadId === "thread-b");
    expect(threadB!.files).toHaveLength(2);
  });
});

describe("output-aggregation — clearThreadOutputs", () => {
  it("deletes the thread directory", () => {
    const dir = ensureThreadOutputDir("thread-del");
    writeFileSync(join(dir, "file.txt"), "content");
    expect(existsSync(dir)).toBe(true);

    const result = clearThreadOutputs("thread-del");
    expect(result).toBe(true);
    expect(existsSync(dir)).toBe(false);
  });

  it("returns false when directory doesn't exist", () => {
    expect(clearThreadOutputs("nonexistent")).toBe(false);
  });
});

describe("output-aggregation — summarizeOutputs", () => {
  it("summarizes counts by type", () => {
    const dir = ensureThreadOutputDir("thread-sum");
    writeFileSync(join(dir, "a.html"), "a");
    writeFileSync(join(dir, "b.html"), "b");
    writeFileSync(join(dir, "c.json"), "c");

    const listing = listAllOutputs();
    const summary = summarizeOutputs(listing);

    expect(summary.threads).toBe(1);
    expect(summary.files).toBe(3);
    expect(summary.byType[".html"]).toBe(2);
    expect(summary.byType[".json"]).toBe(1);
  });
});