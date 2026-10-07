// Agent bundle compiler + promotion — P4/R2+R3 of the coordination matrix
// (`docs/plans/2026-10-06-workspace-agentic-os-coordination-matrix.md`):
//   R2 — compile a desktop persona (SOUL profile + skills) into a
//        cubecloud-agent bundle (tar.gz with config.yaml)
//   R3 — promote it via the bundle registry upload (POST /api/agents)
//
// Bundle contract (cubecloud-agent AGENTSPEC.md + web/src/lib/agentBundle.ts
// — the workspace's own SPA uses exactly this shape):
//   multipart/form-data, part `bundle` = .tar.gz containing
//     config.yaml (spec_version: 1, name, description?, executor.type:
//     agent-meow, executor.config.harness, executor.model, prompt)
//     AGENTS.md (optional instructions; config.yaml gains `instructions:`)
//   201 Created → { id, name }; 409 name conflict; 400 invalid bundle.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { gzipSync, gunzipSync } from "zlib";

export interface AgentBundleInput {
  /** Unique bundle/agent name — becomes the workspace "model". */
  name: string;
  description?: string;
  /** Persona body — becomes `prompt:` and (optionally) AGENTS.md. */
  prompt: string;
  /** Workspace harness, e.g. "openai-agents" | "claude-sdk". */
  harness: string;
  /** Model identifier the workspace executor resolves. */
  model: string;
  /** Optional longer identity/behavior document → AGENTS.md. */
  instructions?: string;
}

export interface AgentPromotionResult {
  success: boolean;
  agentId: string | null;
  agentName: string | null;
  /** True when the server rejected the name as already existing (409). */
  conflict: boolean;
  error: string | null;
}

// ── Tar building (POSIX ustar, gzip via CompressionStream) ──────────

const UPLOAD_TIMEOUT_MS = 30_000;

interface TarEntry {
  name: string;
  data: Uint8Array;
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function buildTar(entries: TarEntry[]): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const entry of entries) {
    const header = new Uint8Array(512);
    const name = entry.name.slice(0, 100);
    header.set(enc(name), 0);
    // ustar offsets: mode 100 (8), uid 108 (8), gid 116 (8),
    // **size 124 (12)**, **mtime 136 (12)**, chksum 148 (8).
    writeOctal(header, 124, 12, entry.data.length); // size
    writeOctal(header, 136, 12, Math.floor(Date.now() / 1000)); // mtime
    writeOctal(header, 108, 8, 0); // uid
    writeOctal(header, 116, 8, 0); // gid
    header.set(enc("0000644\0"), 100); // mode (rw-r--r--)
    header.set(enc("ustar\0"), 257);
    header.set(enc("00"), 263);
    // checksum: treat checksum field as spaces while computing
    header.set(enc("        "), 148);
    let checksum = 0;
    for (const b of header) checksum += b;
    header.set(
      enc(checksum.toString(8).padStart(6, "0") + "\0 "),
      148,
    );
    blocks.push(header, entry.data);
    // pad to 512
    const rem = entry.data.length % 512;
    if (rem !== 0) blocks.push(new Uint8Array(512 - rem));
  }
  blocks.push(new Uint8Array(1024)); // two zero blocks terminate the archive
  const total = blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of blocks) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number): void {
  target.set(
    enc(value.toString(8).padStart(length - 1, "0") + "\0"),
    offset,
  );
}

function hasBlobStream(): boolean {
  return (
    typeof Blob === "function" &&
    typeof (Blob.prototype as { stream?: unknown }).stream === "function"
  );
}

async function gzipBytes(input: Uint8Array): Promise<Uint8Array> {
  // Node (vitest) exposes zlib directly; web-streams gzip (CompressionStream)
  // exists in the Electron renderer where Blob.stream() is present.
  if (!hasBlobStream()) {
    const gz = gzipSync(Buffer.from(input));
    return new Uint8Array(gz);
  }
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function yamlQuote(value: string): string {
  if (/[:#"'\n]|^\s|\s$/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

/** Build config.yaml content for the persona bundle (same shape the
 *  workspace's own SPA emits). */
export function buildBundleConfigYaml(input: AgentBundleInput): string {
  const lines: string[] = ["spec_version: 1", ""];
  lines.push(`name: ${yamlQuote(input.name)}`);
  if (input.description) {
    lines.push(`description: ${yamlQuote(input.description)}`);
  }
  lines.push("");
  lines.push("executor:");
  lines.push("  type: agent-meow");
  lines.push(`  model: ${yamlQuote(input.model)}`);
  lines.push("  config:");
  lines.push(`    harness: ${yamlQuote(input.harness)}`);
  lines.push("");
  lines.push(`prompt: ${yamlQuote(input.prompt)}`);
  lines.push("");
  if (input.instructions) {
    lines.push("instructions: AGENTS.md");
    lines.push("");
  }
  return lines.join("\n");
}

/** Compile the persona into the canonical bundle bytes (.tar.gz). */
export async function compileAgentBundle(
  input: AgentBundleInput,
): Promise<Uint8Array> {
  const entries: TarEntry[] = [
    { name: "config.yaml", data: enc(buildBundleConfigYaml(input)) },
  ];
  if (input.instructions) {
    entries.push({ name: "AGENTS.md", data: enc(input.instructions) });
  }
  return gzipBytes(buildTar(entries));
}

/** Async tar reader — inflates and returns entries as text (test and
 *  validation aid; also proves the archive is well-formed). */
export async function readTarEntries(
  gzip: Uint8Array,
): Promise<Map<string, string>> {
  const raw = await gunzipBytes(gzip);
  const entries = new Map<string, string>();
  let offset = 0;
  while (offset + 512 <= raw.length) {
    const header = raw.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const name = new TextDecoder()
      .decode(header.subarray(0, 100))
      .replace(/\0.*$/, "")
      .trim();
    const size = parseInt(
      new TextDecoder()
        .decode(header.subarray(124, 136))
        .replace(/\0.*$/, "")
        .trim() || "0",
      8,
    );
    const dataStart = offset + 512;
    const data = raw.subarray(dataStart, dataStart + size);
    entries.set(name, new TextDecoder().decode(data));
    const padded = size % 512 === 0 ? 0 : 512 - (size % 512);
    offset = dataStart + size + padded;
  }
  return entries;
}

async function gunzipBytes(input: Uint8Array): Promise<Uint8Array> {
  if (!hasBlobStream()) {
    const raw = gunzipSync(Buffer.from(input));
    return new Uint8Array(raw);
  }
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

// ── Promotion (R3 — the operator-triggered upload) ──────────────────

async function gzipPromise(input: Uint8Array): Promise<Uint8Array> {
  return gzipBytes(input);
}

/** Promote a persona into the workspace bundle registry (row R3).
 *  Operator-triggered only — never automatic. Never throws; the result
 *  shape carries conflict/error state. */
export async function promoteAgentBundle(
  baseUrl: string,
  input: AgentBundleInput,
): Promise<AgentPromotionResult> {
  if (!input.name || input.name.trim() === "") {
    return {
      success: false,
      agentId: null,
      agentName: null,
      conflict: false,
      error: "agent bundle needs a non-empty name",
    };
  }
  try {
    const gz = await gzipPromise(buildTar(toEntries(input)));
    const form = new FormData();
    form.append(
      "bundle",
      new Blob([gz as BlobPart], { type: "application/gzip" }),
      "agent.tar.gz",
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/agents`,
        { method: "POST", body: form, signal: controller.signal },
      );
      if (response.status === 409) {
        return {
          success: false,
          agentId: null,
          agentName: input.name,
          conflict: true,
          error: `name "${input.name}" already exists in the workspace bundle registry (409)`,
        };
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        return {
          success: false,
          agentId: null,
          agentName: null,
          conflict: false,
          error:
            body?.detail ??
            `upload failed with HTTP ${response.status}`,
        };
      }
      const created = (await response.json().catch(() => ({}))) as {
        id?: string;
        name?: string;
      };
      return {
        success: true,
        agentId: created.id ?? null,
        agentName: created.name ?? input.name,
        conflict: false,
        error: null,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return {
      success: false,
      agentId: null,
      agentName: null,
      conflict: false,
      error: String(err),
    };
  }
}

function toEntries(input: AgentBundleInput): TarEntry[] {
  const entries: TarEntry[] = [
    { name: "config.yaml", data: enc(buildBundleConfigYaml(input)) },
  ];
  if (input.instructions) {
    entries.push({ name: "AGENTS.md", data: enc(input.instructions) });
  }
  return entries;
}