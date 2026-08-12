// P4: Scoped memory service tests.
//
// MemoryService: scoped per-profile memory with foldCapture()
// (dedup + FIFO eviction + dated bullets), pluggable strategies,
// and recall/capture visibility policy.
//
// Inspired by qm's memory-service.ts and strategy.ts, adapted to
// the desktop's single-user, per-profile architecture.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type MemoryEntry,
  type MemoryService,
  createMemoryService,
  foldCapture,
  type MemoryStrategy,
  type MemoryPolicy,
  normalizeEntryText,
} from "../src/memory-service";

// ── foldCapture tests ──────────────────────────────────────

describe("foldCapture", () => {
  it("appends a new fact as a dated bullet", () => {
    const existing: MemoryEntry[] = [];
    const result = foldCapture(existing, "User prefers dark mode", new Date("2026-01-01"));
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("User prefers dark mode");
    expect(result[0].createdAt).toBe(new Date("2026-01-01").getTime());
  });

  it("deduplicates by normalized text", () => {
    const existing: MemoryEntry[] = [
      { id: "1", content: "User prefers dark mode", label: "", createdAt: 0 },
    ];
    const result = foldCapture(existing, "user prefers dark mode", new Date("2026-01-02"));
    // Same fact (normalized) → not duplicated
    expect(result).toHaveLength(1);
  });

  it("caps at 300 facts (FIFO eviction)", () => {
    const existing: MemoryEntry[] = Array.from({ length: 300 }, (_, i) => ({
      id: String(i),
      content: `fact ${i}`,
      label: "",
      createdAt: i,
    }));
    const result = foldCapture(existing, "new fact", new Date("2026-01-01"));
    expect(result).toHaveLength(300);
    // Oldest entry (fact 0) should be evicted
    expect(result[0].content).toBe("fact 1");
    // New entry should be at the end
    expect(result[299].content).toBe("new fact");
  });

  it("preserves existing entries when adding new", () => {
    const existing: MemoryEntry[] = [
      { id: "1", content: "fact A", label: "", createdAt: 1 },
      { id: "2", content: "fact B", label: "", createdAt: 2 },
    ];
    const result = foldCapture(existing, "fact C", new Date("2026-01-03"));
    expect(result).toHaveLength(3);
    expect(result[0].content).toBe("fact A");
    expect(result[1].content).toBe("fact B");
    expect(result[2].content).toBe("fact C");
  });
});

describe("normalizeEntryText", () => {
  it("lowercases and trims whitespace", () => {
    expect(normalizeEntryText("  Hello World  ")).toBe("hello world");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeEntryText("hello   world")).toBe("hello world");
  });

  it("removes trailing punctuation for dedup", () => {
    expect(normalizeEntryText("hello world.")).toBe("hello world");
  });
});

// ── MemoryService tests ─────────────────────────────────────

describe("MemoryService", () => {
  let service: MemoryService;

  beforeEach(() => {
    service = createMemoryService({
      maxEntries: 300,
      strategy: "per-turn",
      policy: { recall: "visible", capture: "writable" },
    });
  });

  it("starts empty", () => {
    expect(service.read()).toEqual([]);
  });

  it("captures a fact and retrieves it", () => {
    service.capture("User likes TypeScript");
    const entries = service.read();
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toBe("User likes TypeScript");
  });

  it("deduplicates on capture", () => {
    service.capture("User likes TypeScript");
    service.capture("user likes typescript");
    expect(service.read()).toHaveLength(1);
  });

  it("recall returns all entries when policy is visible", () => {
    service.capture("fact A");
    service.capture("fact B");
    const recalled = service.recall();
    expect(recalled).toHaveLength(2);
  });

  it("recall returns empty when policy is off", () => {
    const offService = createMemoryService({
      maxEntries: 300,
      strategy: "per-turn",
      policy: { recall: "off", capture: "writable" },
    });
    offService.capture("fact A");
    expect(offService.recall()).toEqual([]);
  });

  it("capture is a no-op when policy is off", () => {
    const offService = createMemoryService({
      maxEntries: 300,
      strategy: "per-turn",
      policy: { recall: "visible", capture: "off" },
    });
    offService.capture("fact A");
    expect(offService.read()).toEqual([]);
  });

  it("replace updates an entry by id", () => {
    service.capture("original fact");
    const entries = service.read();
    service.replace(entries[0].id, "updated fact");
    const updated = service.read();
    expect(updated[0].content).toBe("updated fact");
  });

  it("replaceIfRevision updates only when revision matches", () => {
    service.capture("original fact");
    const entries = service.read();
    const stale = service.replaceIfRevision(entries[0].id, entries[0].revision, "updated");
    expect(stale).toBe(true);
    const conflict = service.replaceIfRevision(entries[0].id, "wrong-revision", "conflict");
    expect(conflict).toBe(false);
  });

  it("query searches by keyword", () => {
    service.capture("User prefers dark mode");
    service.capture("User uses VS Code");
    service.capture("User has a cat named Whiskers");
    const results = service.query("dark");
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("User prefers dark mode");
  });

  it("history returns revision history for an entry", () => {
    service.capture("original fact");
    const entries = service.read();
    service.replace(entries[0].id, "updated fact");
    const history = service.history(entries[0].id);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it("clear removes all entries", () => {
    service.capture("fact A");
    service.capture("fact B");
    service.clear();
    expect(service.read()).toEqual([]);
  });

  it("respects maxEntries cap", () => {
    const smallService = createMemoryService({
      maxEntries: 3,
      strategy: "per-turn",
      policy: { recall: "visible", capture: "writable" },
    });
    smallService.capture("fact A");
    smallService.capture("fact B");
    smallService.capture("fact C");
    smallService.capture("fact D"); // should evict fact A
    const entries = smallService.read();
    expect(entries).toHaveLength(3);
    expect(entries[0].content).toBe("fact B");
    expect(entries[2].content).toBe("fact D");
  });
});