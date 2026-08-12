// memory-service.ts — P4: Scoped memory service.
//
// Per-profile memory with foldCapture() (dedup + FIFO eviction +
// dated bullets), pluggable strategies, and recall/capture visibility.
//
// Inspired by qm's memory-service.ts and strategy.ts, adapted to
// the desktop's single-user, per-profile architecture.
//
// "Memory is an index: pointers to data, never the data itself.
//  Working state goes in a file, not memory."

// ── Types ─────────────────────────────────────────────────

/** A single memory entry. */
export interface MemoryEntry {
  id: string;
  content: string;
  label: string;
  createdAt: number;
  /** Revision for optimistic concurrency (replaceIfRevision). */
  revision: string;
}

/** Memory recall/capture policy. */
export interface MemoryPolicy {
  /** recall: off = no recall, visible = recall all, writable = recall writable scope only */
  recall: "off" | "writable" | "visible";
  /** capture: off = no capture, writable = capture to writable scope */
  capture: "off" | "writable";
}

/** Memory strategy: when to capture. */
export type MemoryStrategy = "per-turn" | "agent-only" | "consolidation";

/** Configuration for the memory service. */
export interface MemoryServiceConfig {
  maxEntries: number;
  strategy: MemoryStrategy;
  policy: MemoryPolicy;
}

/** The memory service interface. */
export interface MemoryService {
  /** Read all entries (raw, no policy filtering). */
  read(): MemoryEntry[];
  /** Recall entries (filtered by policy). */
  recall(): MemoryEntry[];
  /** Capture a new fact. */
  capture(content: string): MemoryEntry | null;
  /** Replace an entry by id. */
  replace(id: string, content: string): boolean;
  /** Replace only if the revision matches (optimistic concurrency). */
  replaceIfRevision(id: string, revision: string, content: string): boolean;
  /** Query entries by keyword. */
  query(keyword: string): MemoryEntry[];
  /** Get revision history for an entry. */
  history(id: string): MemoryEntry[];
  /** Clear all entries. */
  clear(): void;
}

// ── normalizeEntryText ─────────────────────────────────────

/** Normalize entry text for dedup comparison. */
export function normalizeEntryText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
}

// ── foldCapture ────────────────────────────────────────────

/** The maximum number of entries before FIFO eviction. */
const DEFAULT_MAX_ENTRIES = 300;

/** Append a new fact to the memory, deduplicating by normalized text
 *  and evicting the oldest entry when the cap is reached. */
export function foldCapture(
  existing: MemoryEntry[],
  content: string,
  timestamp: Date,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): MemoryEntry[] {
  const normalized = normalizeEntryText(content);

  // Dedup: if an existing entry has the same normalized text, skip
  const isDuplicate = existing.some(
    (e) => normalizeEntryText(e.content) === normalized,
  );
  if (isDuplicate) {
    return existing;
  }

  const newEntry: MemoryEntry = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    label: "",
    createdAt: timestamp.getTime(),
    revision: `r1-${timestamp.getTime()}`,
  };

  const result = [...existing, newEntry];

  // FIFO eviction when over cap
  if (result.length > maxEntries) {
    return result.slice(result.length - maxEntries);
  }

  return result;
}

// ── createMemoryService ────────────────────────────────────

/** Create a memory service with the given configuration. */
export function createMemoryService(
  config: MemoryServiceConfig,
): MemoryService {
  let _entries: MemoryEntry[] = [];
  const _history = new Map<string, MemoryEntry[]>();
  // Monotonic counter ensures FIFO ordering even when captures
  // happen in the same millisecond.
  let _seq = 0;

  return {
    read() {
      return [..._entries];
    },

    recall() {
      if (config.policy.recall === "off") {
        return [];
      }
      // For "visible" and "writable", return all entries
      // (in the desktop's single-user model, all entries are writable)
      return [..._entries];
    },

    capture(content: string) {
      if (config.policy.capture === "off") {
        return null;
      }

      const now = Date.now();
      const seq = _seq++;
      const normalized = normalizeEntryText(content);

      // Dedup: if an existing entry has the same normalized text, skip
      const existingIdx = _entries.findIndex(
        (e) => normalizeEntryText(e.content) === normalized,
      );
      if (existingIdx !== -1) {
        return _entries[existingIdx];
      }

      const newEntry: MemoryEntry = {
        id: `mem-${now}-${seq}-${Math.random().toString(36).slice(2, 8)}`,
        content,
        label: "",
        createdAt: now,
        revision: `r1-${now}`,
      };

      _entries = [..._entries, newEntry];

      // FIFO eviction when over cap
      if (_entries.length > config.maxEntries) {
        _entries = _entries.slice(_entries.length - config.maxEntries);
      }

      return _entries[_entries.length - 1];
    },

    replace(id: string, content: string) {
      const idx = _entries.findIndex((e) => e.id === id);
      if (idx === -1) return false;

      // Save to history
      const entryHistory = _history.get(id) ?? [];
      entryHistory.push({ ..._entries[idx] });
      _history.set(id, entryHistory);

      _entries[idx] = {
        ..._entries[idx],
        content,
        revision: `r${entryHistory.length + 2}-${Date.now()}`,
      };
      return true;
    },

    replaceIfRevision(id: string, revision: string, content: string) {
      const entry = _entries.find((e) => e.id === id);
      if (!entry || entry.revision !== revision) {
        return false;
      }
      return this.replace(id, content);
    },

    query(keyword: string) {
      const lower = keyword.toLowerCase();
      return _entries.filter((e) =>
        e.content.toLowerCase().includes(lower),
      );
    },

    history(id: string) {
      return _history.get(id) ?? [];
    },

    clear() {
      _entries = [];
      _history.clear();
    },
  };
}