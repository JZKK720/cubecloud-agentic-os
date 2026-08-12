// knowledge-vault.ts — G3: Knowledge Vault.
//
// User-visible, editable Markdown knowledge base with full-text search.
// Files live in <profile>/vault/. No database, no proprietary format —
// plain Markdown files that users can open in any editor (Obsidian, VS Code).
//
// Inspired by second-brain's SQLite FTS5 patterns and OpenOcta's
// Obsidian-compatible Knowledge Vault, adapted to TypeScript.
//
// v1: In-memory full-text search (inverted index). No vector search.
// v2: Add vector search when embedded local model support is built.

// ── Types ─────────────────────────────────────────────────

/** A file in the vault. */
export interface VaultFile {
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/** A search result. */
export interface SearchResult {
  fileName: string;
  score: number;
  snippet: string;
}

/** The knowledge vault interface. */
export interface KnowledgeVault {
  /** List all files in the vault. */
  listFiles(): VaultFile[];
  /** Read a file by name. Returns null if not found. */
  readFile(name: string): VaultFile | null;
  /** Add a new file. */
  addFile(name: string, content: string): VaultFile;
  /** Update an existing file. */
  updateFile(name: string, content: string): boolean;
  /** Delete a file. */
  deleteFile(name: string): boolean;
  /** Full-text search across all files. */
  search(query: string): SearchResult[];
  /** Clear all files. */
  clear(): void;
}

// ── tokenize ──────────────────────────────────────────────

/** Tokenize text into lowercase search tokens.
 *  Removes punctuation, filters tokens < 2 chars. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// ── createKnowledgeVault ──────────────────────────────────

/** Create an in-memory knowledge vault with full-text search. */
export function createKnowledgeVault(): KnowledgeVault {
  const _files = new Map<string, VaultFile>();
  // Inverted index: token → Set of file names
  const _index = new Map<string, Set<string>>();

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
      return true;
    },

    deleteFile(name: string): boolean {
      const existed = _files.has(name);
      _files.delete(name);
      // Clean up index
      for (const [token, names] of _index) {
        names.delete(name);
        if (names.size === 0) _index.delete(token);
      }
      return existed;
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

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      return results;
    },

    clear(): void {
      _files.clear();
      _index.clear();
    },
  };
}