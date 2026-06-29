// output-aggregation.ts — DeerFlow Adaptation #3: output aggregation & surfacing.
//
// The desktop collects deliverables that runtimes produce and surfaces them
// in the renderer. The desktop does NOT produce the deliverables — the
// runtime does (in its own sandbox/workspace). The desktop just watches
// a shared outputs directory and lists what's there.
//
// Directory layout:
//   <profile>/outputs/<thread-id>/
//     report.html
//     slides.pptx
//     data.json
//     ...
//
// The renderer gets an Outputs panel (like CodeGraph/EverOS/Headroom screens)
// that lists deliverables per conversation with preview + open buttons.

import { existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { join, extname, basename } from "path";
import { profileHome } from "./utils";

// ── Types ─────────────────────────────────────────────────

export interface OutputFile {
  /** Filename (e.g. "report.html"). */
  name: string;
  /** Absolute path. */
  path: string;
  /** File extension (e.g. ".html"). */
  extension: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Last modified time (ISO 8601). */
  modifiedAt: string;
  /** MIME type guess for preview rendering. */
  mimeType: string;
}

export interface ThreadOutputs {
  /** Thread/conversation ID. */
  threadId: string;
  /** Directory path. */
  dirPath: string;
  /** Files in this thread's output directory. */
  files: OutputFile[];
}

export interface OutputsListing {
  scannedAt: string;
  threads: ThreadOutputs[];
  totalFiles: number;
}

// ── MIME type guessing ────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".zip": "application/zip",
};

function guessMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

// ── Directory layout ──────────────────────────────────────

function outputsRoot(profile?: string): string {
  return join(profileHome(profile), "outputs");
}

function threadOutputsDir(threadId: string, profile?: string): string {
  return join(outputsRoot(profile), threadId);
}

// ── Public API ────────────────────────────────────────────

/** Ensure a thread's output directory exists. Runtimes call
 *  this (via IPC) before writing deliverables. */
export function ensureThreadOutputDir(
  threadId: string,
  profile?: string,
): string {
  const dir = threadOutputsDir(threadId, profile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** List all output files for a specific thread. */
export function listThreadOutputs(
  threadId: string,
  profile?: string,
): ThreadOutputs {
  const dir = threadOutputsDir(threadId, profile);
  const files: OutputFile[] = [];

  if (existsSync(dir)) {
    try {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isFile()) {
          files.push({
            name: entry,
            path: fullPath,
            extension: extname(entry).toLowerCase(),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            mimeType: guessMimeType(entry),
          });
        }
      }
    } catch {
      // Directory read failed — return empty.
    }
  }

  // Sort by modified time descending (newest first).
  files.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));

  return {
    threadId,
    dirPath: dir,
    files,
  };
}

/** List all threads that have output directories, with their files. */
export function listAllOutputs(profile?: string): OutputsListing {
  const root = outputsRoot(profile);
  const threads: ThreadOutputs[] = [];

  if (existsSync(root)) {
    try {
      for (const entry of readdirSync(root)) {
        const fullPath = join(root, entry);
        if (statSync(fullPath).isDirectory()) {
          threads.push(listThreadOutputs(entry, profile));
        }
      }
    } catch {
      // Root read failed — return empty.
    }
  }

  const totalFiles = threads.reduce((sum, t) => sum + t.files.length, 0);

  return {
    scannedAt: new Date().toISOString(),
    threads,
    totalFiles,
  };
}

/** Delete a thread's output directory. Returns true if it existed. */
export function clearThreadOutputs(
  threadId: string,
  profile?: string,
): boolean {
  const dir = threadOutputsDir(threadId, profile);
  if (!existsSync(dir)) return false;
  try {
    const { rmSync } = require("fs");
    rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/** Summarize outputs for the renderer. */
export function summarizeOutputs(listing: OutputsListing): {
  threads: number;
  files: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  for (const thread of listing.threads) {
    for (const file of thread.files) {
      const type = file.extension || "(no ext)";
      byType[type] = (byType[type] ?? 0) + 1;
    }
  }
  return {
    threads: listing.threads.length,
    files: listing.totalFiles,
    byType,
  };
}