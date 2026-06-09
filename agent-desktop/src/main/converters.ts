// file_to_markdown converter chain (Step 4 of the 7-step harvest
// rollout, harvested from markitdown — github.com/microsoft/markitdown).
//
// Goal: drop a binary blob (PDF, DOCX, image, …) on the agent and
// let it ingest a clean markdown rendering of its content. We prefer
// the `markitdown` CLI when it is on PATH; otherwise we fall back to a
// small chain of built-in pure-JS converters for the formats users
// actually attach (txt, md, json, csv, html). The result lands in the
// wiki raw layer (see ./wiki.ts) so the Karpathy 3-layer memory can
// later index it.
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync } from "fs";
import { basename, extname } from "path";

import { resolveCommandOnPath } from "./agent-clis";
import { getEnhancedPath } from "./installer";

const execFileAsync = promisify(execFile);

/** DocumentConverterResult — what every converter returns. Mirrors
 *  the upstream markitdown DocumentConverterResult so the rest of
 *  the agent (Memory, Skills) can be format-agnostic. */
export interface DocumentConverterResult {
  /** Markdown rendering of the document. Always non-empty when
   *  `success` is true. */
  markdown: string;
  /** Free-form metadata the converter chose to surface. For
   *  markitdown CLI this is the upstream `DocumentConverterResult`
   *  metadata; for built-in converters it is a small typed bag. */
  metadata: Record<string, unknown>;
  /** Which converter handled the request, e.g. "markitdown-cli",
   *  "builtin-text", "builtin-csv". Useful for telemetry and for
   *  the renderer's "ingest mode" badge. */
  converter: string;
}

export interface DocumentConverterError {
  success: false;
  error: string;
  /** When true, the error is permanent (unsupported format). When
   *  false, a retry might help (e.g. transient markitdown CLI
   *  crash). */
  permanent?: boolean;
  converter?: string;
}

export interface DocumentConverterSuccess {
  success: true;
  result: DocumentConverterResult;
}

export type DocumentConverterOutcome =
  | DocumentConverterSuccess
  | DocumentConverterError;

export interface DocumentConverter {
  /** Stable name used for telemetry and for the converter badge. */
  name: string;
  /** Returns true if this converter is willing to handle the file. */
  accepts(filePath: string): boolean;
  /** Convert the file. Throw on hard failure (caller converts to a
   *  DocumentConverterError). */
  convert(filePath: string): Promise<DocumentConverterResult>;
}

/** Shell out to the markitdown CLI (github.com/microsoft/markitdown).
 *  Returns a `permanent: true` error when the format is not on the
 *  upstream whitelist, so the chain can move on to the next
 *  converter. */
class MarkitdownCliConverter implements DocumentConverter {
  readonly name = "markitdown-cli";

  accepts(): boolean {
    // The CLI decides per-file; we just say "yes, try me" and let
    // the runtime return a graceful error for unknown formats.
    return true;
  }

  async convert(filePath: string): Promise<DocumentConverterResult> {
    const envPath = getEnhancedPath();
    const resolved = resolveCommandOnPath("markitdown", envPath);
    if (!resolved) {
      throw new ConverterSkip("markitdown CLI not on PATH");
    }

    let stdout: string;
    let stderr: string;
    try {
      const result = await execFileAsync(resolved, [filePath], {
        timeout: 60_000,
        windowsHide: true,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, PATH: envPath },
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (err) {
      const e = err as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
      };
      stdout = e.stdout ?? "";
      stderr = e.stderr ?? "";
      const msg = (stderr || e.message || "").toLowerCase();
      // markitdown exits 1 with "unsupported" for formats it does
      // not handle. Treat that as a chain skip rather than a hard
      // failure.
      if (
        msg.includes("unsupported") ||
        msg.includes("no converter") ||
        msg.includes("not supported")
      ) {
        throw new ConverterSkip(`markitdown cannot handle ${filePath}`);
      }
      throw new Error(
        `markitdown CLI failed: ${(stderr || e.message || "unknown").trim()}`,
      );
    }

    return {
      markdown: stdout.trim(),
      metadata: {
        source: "markitdown",
        command: resolved,
        stderr: stderr.trim() || undefined,
      },
      converter: this.name,
    };
  }
}

/** Pure-JS fallback for plain text / markdown / json / csv / html. */
class BuiltinTextConverter implements DocumentConverter {
  readonly name = "builtin-text";
  private static exts = new Set([
    ".txt",
    ".md",
    ".markdown",
    ".log",
    ".rst",
    ".adoc",
  ]);

  accepts(filePath: string): boolean {
    return BuiltinTextConverter.exts.has(extname(filePath).toLowerCase());
  }

  async convert(filePath: string): Promise<DocumentConverterResult> {
    const raw = readFileSync(filePath, "utf-8");
    return {
      markdown: raw,
      metadata: {
        source: "builtin-text",
        bytes: raw.length,
        filename: basename(filePath),
      },
      converter: this.name,
    };
  }
}

class BuiltinJsonConverter implements DocumentConverter {
  readonly name = "builtin-json";

  accepts(filePath: string): boolean {
    return extname(filePath).toLowerCase() === ".json";
  }

  async convert(filePath: string): Promise<DocumentConverterResult> {
    const raw = readFileSync(filePath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Invalid JSON in ${filePath}: ${(err as Error).message}`,
      );
    }
    const pretty = JSON.stringify(parsed, null, 2);
    return {
      markdown: "```json\n" + pretty + "\n```",
      metadata: {
        source: "builtin-json",
        bytes: raw.length,
      },
      converter: this.name,
    };
  }
}

class BuiltinCsvConverter implements DocumentConverter {
  readonly name = "builtin-csv";

  accepts(filePath: string): boolean {
    return extname(filePath).toLowerCase() === ".csv";
  }

  async convert(filePath: string): Promise<DocumentConverterResult> {
    const raw = readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) {
      return {
        markdown: "",
        metadata: { source: "builtin-csv", rows: 0 },
        converter: this.name,
      };
    }
    const splitCsvLine = (line: string): string[] => {
      // Lightweight CSV splitter that handles quoted fields with
      // embedded commas. Not RFC 4180 complete (no embedded
      // newlines in quoted fields) but adequate for the common case.
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else {
          if (ch === ",") {
            out.push(cur);
            cur = "";
          } else if (ch === '"' && cur === "") {
            inQuotes = true;
          } else {
            cur += ch;
          }
        }
      }
      out.push(cur);
      return out;
    };

    const header = splitCsvLine(lines[0]).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => splitCsvLine(line));
    const mdLines: string[] = [];
    mdLines.push("| " + header.join(" | ") + " |");
    mdLines.push("| " + header.map(() => "---").join(" | ") + " |");
    for (const row of rows) {
      mdLines.push("| " + row.join(" | ") + " |");
    }
    return {
      markdown: mdLines.join("\n"),
      metadata: {
        source: "builtin-csv",
        rows: rows.length,
        columns: header.length,
      },
      converter: this.name,
    };
  }
}

class BuiltinHtmlConverter implements DocumentConverter {
  readonly name = "builtin-html";

  accepts(filePath: string): boolean {
    const e = extname(filePath).toLowerCase();
    return e === ".html" || e === ".htm";
  }

  async convert(filePath: string): Promise<DocumentConverterResult> {
    const raw = readFileSync(filePath, "utf-8");
    // Strip <script> and <style> blocks before rendering so we do
    // not surface their contents as "text" in the markdown.
    const cleaned = raw
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");
    // Heading replacement
    const md = cleaned
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
      .replace(/<\/(p|div|section)>/gi, "\n")
      .replace(/<br\s*\/?>(?!\n)/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return {
      markdown: md,
      metadata: { source: "builtin-html", bytes: raw.length },
      converter: this.name,
    };
  }
}

/** Internal signal used by converters to tell the chain "I am not
 *  the right tool for this file" without bubbling up a hard error. */
class ConverterSkip extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConverterSkip";
  }
}

/** Default converter chain, in priority order. */
const DEFAULT_CHAIN: DocumentConverter[] = [
  new MarkitdownCliConverter(),
  new BuiltinHtmlConverter(),
  new BuiltinJsonConverter(),
  new BuiltinCsvConverter(),
  new BuiltinTextConverter(),
];

export interface ConvertFileOptions {
  /** Override the default chain (used by tests and the Skills
   *  surface when a custom converter is registered). */
  chain?: DocumentConverter[];
}

export async function convertFileToMarkdown(
  filePath: string,
  options: ConvertFileOptions = {},
): Promise<DocumentConverterOutcome> {
  if (!filePath || !filePath.trim()) {
    return { success: false, error: "No file path supplied.", permanent: true };
  }
  if (!existsSync(filePath)) {
    return {
      success: false,
      error: `File does not exist: ${filePath}`,
      permanent: true,
    };
  }

  const chain = options.chain ?? DEFAULT_CHAIN;
  const tried: string[] = [];
  let lastError: string | null = null;
  for (const converter of chain) {
    if (!converter.accepts(filePath)) continue;
    tried.push(converter.name);
    try {
      const result = await converter.convert(filePath);
      return { success: true, result };
    } catch (err) {
      if (err instanceof ConverterSkip) {
        // The converter itself decided it cannot handle this file.
        // Continue down the chain.
        continue;
      }
      // Hard error: report but keep trying fallbacks unless this is
      // the only converter that accepted the file.
      lastError = (err as Error).message;
      if (tried.length === chain.filter((c) => c.accepts(filePath)).length) {
        return {
          success: false,
          error: lastError,
          converter: converter.name,
        };
      }
    }
  }

  if (lastError) {
    return { success: false, error: lastError, converter: tried.at(-1) };
  }
  return {
    success: false,
    error: `No converter accepted ${filePath}. Tried: ${tried.join(", ") || "(none)"}.`,
    permanent: true,
  };
}

/** Returns true when the markitdown CLI is on PATH. Used by the
 *  Setup surface and the Skills catalog. */
export function isMarkitdownAvailable(): boolean {
  return resolveCommandOnPath("markitdown", getEnhancedPath()) !== null;
}
