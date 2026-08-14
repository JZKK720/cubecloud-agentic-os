// knowledge-vault-fs.ts — G3: File-system-backed Knowledge Vault.
//
// Disk-persisted Markdown knowledge base with full-text search.
// Files live as <vaultDir>/<name>.md on disk — plain Markdown, editable
// in any editor (Obsidian, VS Code). An in-memory inverted index provides
// fast search; the index is rebuilt on load and on each write.
//
// No external dependencies — uses Node.js fs only. For external file
// watching (user edits in Obsidian), the caller can use chokidar to
// watch the vault directory and call reload() on changes.
//
// Inspired by obsidian-index-service (pmmvr/obsidian-index-service) and
// OpenOcta's Obsidian-compatible Knowledge Vault.

import * as fs from "fs";
import * as path from "path";
import type { KnowledgeVault, VaultFile, SearchResult } from "./knowledge-vault";
import { tokenize } from "./knowledge-vault";

/** Create a file-system-backed knowledge vault.
 *  @param vaultDir Absolute path to the vault directory. Created if missing.
 *  Files are stored as <vaultDir>/<name>.md. */
export function createFsKnowledgeVault(vaultDir: string): KnowledgeVault {
  // Ensure the vault directory exists
  fs.mkdirSync(vaultDir, { recursive: true });

  // In-memory cache: filename → VaultFile (content read from disk)
  const _files = new Map<string, VaultFile>();
  // Inverted index: token → Set of file names
  const _index = new Map<string, Set<string>>();

  function filePath(name: string): string {
    // Sanitize: only allow alphanumeric, dash, underscore, dot in filenames
    // Prevent path traversal
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, "-");
    return path.join(vaultDir, `${safe}.md`);
  }

  function reindexFile(name: string, content: string): void {
    // Remove old index entries for this file
    for (const [token, names] of _index) {
      names.delete(name);
      if (names.size === 0) _index.delete(token);
    }
    // Add new index entries
    const tokens = tokenize(content);
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      if (!_index.has(token)) {
        _index.set(token, new Set());
      }
      _index.get(token)!.add(name);
    }
  }

  function makeSnippet(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const idx = lowerContent.indexOf(query.toLowerCase());
    if (idx === -1) return content.slice(0, 100);
    const start = Math.max(0, idx - 30);
    const end = Math.min(content.length, idx + query.length + 70);
    return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
  }

  /** Load all .md files from disk into the in-memory cache + index. */
  function loadFromDisk(): void {
    _files.clear();
    _index.clear();
    const entries = fs.readdirSync(vaultDir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const fullPath = path.join(vaultDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        const name = entry.replace(/\.md$/, "");
        _files.set(name, {
          name,
          content,
          createdAt: stat.birthtimeMs || stat.atimeMs || Date.now(),
          updatedAt: stat.mtimeMs || Date.now(),
        });
        reindexFile(name, content);
      } catch {
        // Skip unreadable files
      }
    }
  }

  // Load existing files on startup
  loadFromDisk();

  return {
    listFiles(): VaultFile[] {
      return Array.from(_files.values());
    },

    readFile(name: string): VaultFile | null {
      return _files.get(name) ?? null;
    },

    addFile(name: string, content: string): VaultFile {
      const now = Date.now();
      const file: VaultFile = {
        name,
        content,
        createdAt: now,
        updatedAt: now,
      };
      _files.set(name, file);
      reindexFile(name, content);
      // Persist to disk
      fs.writeFileSync(filePath(name), content, "utf-8");
      return file;
    },

    updateFile(name: string, content: string): boolean {
      const file = _files.get(name);
      if (!file) return false;
      const updated: VaultFile = {
        ...file,
        content,
        updatedAt: Date.now(),
      };
      _files.set(name, updated);
      reindexFile(name, content);
      // Persist to disk
      fs.writeFileSync(filePath(name), content, "utf-8");
      return true;
    },

    deleteFile(name: string): boolean {
      const existed = _files.has(name);
      if (!existed) return false;
      _files.delete(name);
      // Clean up index
      for (const [token, names] of _index) {
        names.delete(name);
        if (names.size === 0) _index.delete(token);
      }
      // Remove from disk
      try {
        fs.unlinkSync(filePath(name));
      } catch {
        // File may have been removed externally — non-fatal
      }
      return true;
    },

    search(query: string): SearchResult[] {
      const tokens = tokenize(query);
      if (tokens.length === 0) return [];

      // Find files that contain all query tokens
      const candidateSets = tokens.map((t) => _index.get(t) ?? new Set<string>());
      const intersection = new Set<string>(
        candidateSets[0] ? Array.from(candidateSets[0]) : [],
      );
      for (let i = 1; i < candidateSets.length; i++) {
        const next = new Set<string>();
        for (const name of intersection) {
          if (candidateSets[i].has(name)) next.add(name);
        }
        intersection.clear();
        for (const name of next) intersection.add(name);
      }

      // Score by token frequency
      const results: SearchResult[] = [];
      for (const fileName of intersection) {
        const file = _files.get(fileName);
        if (!file) continue;

        const fileTokens = tokenize(file.content);
        const tokenCounts = new Map<string, number>();
        for (const t of fileTokens) {
          tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
        }

        let score = 0;
        for (const qt of tokens) {
          score += tokenCounts.get(qt) ?? 0;
        }

        results.push({
          fileName,
          score,
          snippet: makeSnippet(file.content, query),
        });
      }

      results.sort((a, b) => b.score - a.score);
      return results;
    },

    clear(): void {
      // Delete all .md files from disk
      for (const name of _files.keys()) {
        try {
          fs.unlinkSync(filePath(name));
        } catch {
          // non-fatal
        }
      }
      _files.clear();
      _index.clear();
    },
  };
}