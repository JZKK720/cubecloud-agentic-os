// knowledge-vault-fs.test.ts — tests for the file-system-backed Knowledge Vault.
//
// Tests disk persistence: files survive reload, CRUD operations write to disk,
// search works across persisted files.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createFsKnowledgeVault } from "../src/knowledge-vault-fs";
import type { KnowledgeVault } from "../src/knowledge-vault";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("createFsKnowledgeVault", () => {
  it("creates the vault directory if it does not exist", () => {
    const dir = path.join(tmpDir, "sub", "vault");
    const vault = createFsKnowledgeVault(dir);
    expect(fs.existsSync(dir)).toBe(true);
    vault.clear();
  });

  it("starts empty when the directory has no .md files", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    expect(vault.listFiles()).toHaveLength(0);
  });

  it("loads existing .md files from disk on startup", () => {
    // Pre-populate the directory
    fs.writeFileSync(path.join(tmpDir, "notes.md"), "# Architecture Notes\n\nThe system uses a microservices approach.", "utf-8");
    fs.writeFileSync(path.join(tmpDir, "ideas.md"), "# Ideas\n\nBuild a local-first AI desktop.", "utf-8");

    const vault = createFsKnowledgeVault(tmpDir);
    const files = vault.listFiles();
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name).sort()).toEqual(["ideas", "notes"]);
  });

  it("persists files to disk and survives reload", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    vault.addFile("architecture", "# Architecture\n\nThe desktop is a control plane.");

    // Verify file exists on disk
    const filePath = path.join(tmpDir, "architecture.md");
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, "utf-8")).toContain("control plane");

    // Create a new vault instance pointing to the same directory
    const vault2 = createFsKnowledgeVault(tmpDir);
    const file = vault2.readFile("architecture");
    expect(file).not.toBeNull();
    expect(file!.content).toContain("control plane");
  });

  it("updates files on disk", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    vault.addFile("test", "original content");
    vault.updateFile("test", "updated content");

    const filePath = path.join(tmpDir, "test.md");
    expect(fs.readFileSync(filePath, "utf-8")).toBe("updated content");
    expect(vault.readFile("test")!.content).toBe("updated content");
  });

  it("deletes files from disk", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    vault.addFile("deleteme", "delete this");
    expect(fs.existsSync(path.join(tmpDir, "deleteme.md"))).toBe(true);

    vault.deleteFile("deleteme");
    expect(fs.existsSync(path.join(tmpDir, "deleteme.md"))).toBe(false);
    expect(vault.readFile("deleteme")).toBeNull();
  });

  it("searches across persisted files", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    vault.addFile("notes", "The architecture uses microservices for scalability");
    vault.addFile("ideas", "Build a local-first desktop with microservices");

    const results = vault.search("microservices");
    expect(results).toHaveLength(2);
    expect(results[0].fileName).toBeDefined();
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].snippet).toContain("microservices");
  });

  it("clears all files from disk", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    vault.addFile("a", "content a");
    vault.addFile("b", "content b");
    vault.clear();

    expect(vault.listFiles()).toHaveLength(0);
    expect(fs.existsSync(path.join(tmpDir, "a.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "b.md"))).toBe(false);
  });

  it("sanitizes filenames to prevent path traversal", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    vault.addFile("../../../etc/passwd", "malicious");

    // The sanitizer replaces non-alphanumeric chars with '-'
    // Verify no file was created outside the vault directory
    expect(fs.existsSync("/etc/passwd.md")).toBe(false);
    // The file should exist somewhere inside the vault directory
    const mdFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".md"));
    expect(mdFiles.length).toBe(1);
    // Verify the content is correct
    expect(fs.readFileSync(path.join(tmpDir, mdFiles[0]), "utf-8")).toBe("malicious");
  });

  it("ignores non-markdown files in the vault directory", () => {
    fs.writeFileSync(path.join(tmpDir, "readme.txt"), "not markdown", "utf-8");
    fs.writeFileSync(path.join(tmpDir, "notes.md"), "# Notes\n\nReal markdown.", "utf-8");

    const vault = createFsKnowledgeVault(tmpDir);
    expect(vault.listFiles()).toHaveLength(1);
    expect(vault.listFiles()[0].name).toBe("notes");
  });

  it("returns false when updating non-existent file", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    expect(vault.updateFile("nonexistent", "content")).toBe(false);
  });

  it("returns false when deleting non-existent file", () => {
    const vault = createFsKnowledgeVault(tmpDir);
    expect(vault.deleteFile("nonexistent")).toBe(false);
  });
});