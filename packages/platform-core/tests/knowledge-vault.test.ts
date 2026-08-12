// G3: Knowledge Vault tests.
//
// KnowledgeVault: user-visible, editable Markdown knowledge base
// with full-text search. Files live in <profile>/vault/. No database,
// no proprietary format — plain Markdown files.
//
// Inspired by second-brain's SQLite FTS5 patterns and OpenOcta's
// Obsidian-compatible Knowledge Vault, adapted to TypeScript.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type KnowledgeVault,
  type VaultFile,
  type SearchResult,
  createKnowledgeVault,
  tokenize,
} from "../src/knowledge-vault";

// ── tokenize tests ────────────────────────────────────────

describe("tokenize", () => {
  it("splits text into lowercase tokens", () => {
    const tokens = tokenize("Hello World Test");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
    expect(tokens).toContain("test");
  });

  it("removes punctuation", () => {
    const tokens = tokenize("hello, world! test.");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
    expect(tokens).toContain("test");
  });

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles markdown headers", () => {
    const tokens = tokenize("# Architecture Notes\nThe system uses...");
    expect(tokens).toContain("architecture");
    expect(tokens).toContain("notes");
    expect(tokens).toContain("system");
    expect(tokens).toContain("uses");
  });

  it("filters out very short tokens (< 2 chars)", () => {
    const tokens = tokenize("a an the test");
    expect(tokens).not.toContain("a");
    expect(tokens).toContain("an");
    expect(tokens).toContain("the");
    expect(tokens).toContain("test");
  });
});

// ── KnowledgeVault tests ───────────────────────────────────

describe("KnowledgeVault", () => {
  let vault: KnowledgeVault;

  beforeEach(() => {
    vault = createKnowledgeVault();
  });

  it("starts empty", () => {
    expect(vault.listFiles()).toEqual([]);
    expect(vault.search("test")).toEqual([]);
  });

  it("adds a file to the vault", () => {
    vault.addFile("notes.md", "# Notes\nThis is a test note.");
    const files = vault.listFiles();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("notes.md");
    expect(files[0].content).toContain("test note");
  });

  it("reads a file by name", () => {
    vault.addFile("arch.md", "# Architecture\nThe harness interface...");
    const file = vault.readFile("arch.md");
    expect(file).not.toBeNull();
    expect(file!.content).toContain("harness interface");
  });

  it("returns null for non-existent file", () => {
    expect(vault.readFile("nonexistent.md")).toBeNull();
  });

  it("updates a file", () => {
    vault.addFile("test.md", "original content");
    vault.updateFile("test.md", "updated content");
    const file = vault.readFile("test.md");
    expect(file!.content).toBe("updated content");
  });

  it("deletes a file", () => {
    vault.addFile("temp.md", "temporary");
    vault.deleteFile("temp.md");
    expect(vault.readFile("temp.md")).toBeNull();
    expect(vault.listFiles()).toHaveLength(0);
  });

  it("searches by keyword", () => {
    vault.addFile("arch.md", "# Architecture\nThe harness interface is key.");
    vault.addFile("notes.md", "# Meeting Notes\nDiscussed the roadmap.");
    vault.addFile("todo.md", "# TODO\n- Implement harness\n- Test interface");

    const results = vault.search("harness");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some((r) => r.fileName === "arch.md")).toBe(true);
    expect(results.some((r) => r.fileName === "todo.md")).toBe(true);
  });

  it("search results include match score", () => {
    vault.addFile("a.md", "harness harness harness");
    vault.addFile("b.md", "harness");
    const results = vault.search("harness");
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].fileName).toBe("a.md");
  });

  it("search returns empty for no matches", () => {
    vault.addFile("test.md", "hello world");
    expect(vault.search("nonexistent")).toEqual([]);
  });

  it("search is case-insensitive", () => {
    vault.addFile("test.md", "The HARNESS is important");
    const results = vault.search("harness");
    expect(results).toHaveLength(1);
  });

  it("clear removes all files", () => {
    vault.addFile("a.md", "content a");
    vault.addFile("b.md", "content b");
    vault.clear();
    expect(vault.listFiles()).toEqual([]);
  });

  it("listFiles returns all file names", () => {
    vault.addFile("a.md", "a");
    vault.addFile("b.md", "b");
    vault.addFile("c.md", "c");
    const files = vault.listFiles();
    expect(files).toHaveLength(3);
    expect(files.map((f) => f.name)).toContain("a.md");
    expect(files.map((f) => f.name)).toContain("b.md");
    expect(files.map((f) => f.name)).toContain("c.md");
  });
});