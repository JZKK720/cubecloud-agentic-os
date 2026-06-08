// Plans / Orchestrator surface (Step 7 of the harvest rollout).
//
// Goal: take a markdown plan or RFC the user pastes, decompose
// it into ordered steps, and dispatch each step to the Kanban
// orchestrator. The plan itself lives at
// `<profile>/plans/<plan-id>/plan.json` so it survives restarts
// and can be re-dispatched (e.g. after a profile reset).
//
// The format we accept is loose: a markdown document with `## N.
// Title` or `### N. Title` headings, each followed by body text.
// We extract:
//
//   - The plan title (first H1 or "Untitled Plan" as fallback).
//   - One step per H2/H3 section, with its body, an "Owner:"
//     metadata line if present, and a "Depends on: N, M" line if
//     present.
//
// We deliberately *don't* try to be a full markdown parser — the
// goal is to give the user a fast first cut they can edit before
// dispatch.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { profileHome } from "./utils";

/** A single executable step in a plan. */
export interface PlanStep {
  /** Stable id, unique within the plan. Format: `s1`, `s2`, ... */
  id: string;
  /** Human title extracted from the heading line. */
  title: string;
  /** Body of the step, trimmed. Empty body is fine. */
  body: string;
  /** Optional owner (parsed from an `Owner:` line). */
  owner: string | null;
  /** Optional dependency on other step ids. */
  dependsOn: string[];
  /** Skills mentioned in the body, extracted heuristically. */
  skills: string[];
  /** Tags mentioned in the body (lowercased `#tag` style). */
  tags: string[];
}

/** A parsed plan ready to dispatch. */
export interface Plan {
  /** Stable id (kebab-case, derived from the title or random). */
  id: string;
  /** Plan title. */
  title: string;
  /** Original markdown, kept verbatim so the renderer can show a diff. */
  markdown: string;
  /** Ordered list of steps. Order = the order they appear in the source. */
  steps: PlanStep[];
  /** When the plan was created (ISO 8601). */
  createdAt: string;
  /** When the plan was last dispatched (ISO 8601), if ever. */
  dispatchedAt: string | null;
}

/** Result of a dispatch call. */
export interface DispatchResult {
  planId: string;
  dispatchedAt: string;
  stepResults: Array<{
    stepId: string;
    taskId: string | null;
    error: string | null;
  }>;
  /**
   * Optional `careful` advisory. Set when a step body contains a
   * destructive shell command; the renderer should show a confirm
   * dialog before re-dispatching. V1 only — V2 will refuse by
   * default.
   */
  careful?: {
    /** id of the first step that contains a destructive command. */
    stepId: string;
    /** the destructive line itself. */
    command: string;
    /** careful verdict, e.g. "warn" or "block". */
    verdict: "warn" | "block";
    /** human-readable reason. */
    reason: string;
  };
}

/** A thrown error with a machine-readable kind. */
export type PlanError = Error & { kind: "not_found" | "invalid" };

function makeError(kind: PlanError["kind"], message: string): PlanError {
  const e = new Error(message) as PlanError;
  e.kind = kind;
  return e;
}

/** Slugify a string for use as a plan id. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "plan";
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function plansRoot(profile?: string): string {
  return join(profileHome(profile), "plans");
}

function planDir(id: string, profile?: string): string {
  return join(plansRoot(profile), id);
}

function planJsonPath(id: string, profile?: string): string {
  return join(planDir(id, profile), "plan.json");
}

function readJsonSafe<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  // We write the file directly. For plans (small JSON), a
  // crash mid-write will leave a truncated file that the next
  // readJsonSafe will treat as "no plan" rather than corrupt
  // downstream state. The user can re-paste the markdown.
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** Split a markdown body into ordered sections, where each
 *  section starts at an H2 (`## `) or H3 (`### `) heading. The
 *  pre-section preamble (before any heading) becomes section
 *  index 0 with title "Overview". */
function splitIntoSections(markdown: string): Array<{
  title: string;
  body: string;
}> {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ title: string; body: string }> = [];
  let current: { title: string; body: string[] } | null = null;
  let preamble: string[] = [];

  const flushPreamble = (exceptNextTitle?: string): void => {
    const text = preamble.join("\n").trim();
    if (text) {
      // If the next section is itself titled "Overview", skip the
      // preamble — otherwise we end up with two "Overview" sections
      // in a row, which is just noise on the board.
      if (
        !exceptNextTitle ||
        exceptNextTitle.toLowerCase() !== "overview"
      ) {
        sections.push({ title: "Overview", body: text });
      }
    }
    preamble = [];
  };

  const flushCurrent = (): void => {
    if (current) {
      sections.push({
        title: current.title,
        body: current.body.join("\n").trim(),
      });
      current = null;
    }
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h2 || h3) {
      const nextTitle = (h2 || h3)![1].trim();
      flushPreamble(nextTitle);
      flushCurrent();
      current = { title: nextTitle, body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }
  flushPreamble();
  flushCurrent();
  return sections;
}

/** Parse an "Owner: alice" line from a step body. */
function parseOwner(body: string): string | null {
  const m = body.match(/^\s*Owner:\s*([^\n]+?)\s*$/im);
  return m ? m[1].trim() : null;
}

/** Parse a "Depends on: s1, s2" or "Depends on: 1, 2" line. */
function parseDependsOn(body: string): string[] {
  const m = body.match(/^\s*Depends on:\s*([^\n]+?)\s*$/im);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract `skill-name` style tokens from a body. We look for
 *  any of the desktop's known skills, case-insensitive. */
const KNOWN_SKILLS = [
  "agentic-engineering",
  "agent-harness-construction",
  "autonomous-agent-harness",
  "continuous-learning-v2",
  "diff-overlay-writer",
  "eval-harness",
  "hermes-imports",
  "kanban-task-shape",
  "markitdown-mcp",
  "openclaw-persona-forge",
  "wiki-conventions",
  "windows-desktop-e2e",
  "karpathy-guidelines",
  "typescript-expert",
  "electron-pro",
  "design-taste-frontend",
  // gstack-flavoured skills (V2 harvest rollout)
  "office-hours",
  "careful",
  "investigate",
  "freeze",
  "learn",
  "plan-tune",
];

function parseSkills(body: string): string[] {
  const lower = body.toLowerCase();
  const found = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return [...found].sort();
}

/** Extract `#tag` style tokens from a body. */
function parseTags(body: string): string[] {
  const tags = new Set<string>();
  const re = /#([a-z0-9][a-z0-9_-]{1,40})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    tags.add(m[1].toLowerCase());
  }
  return [...tags].sort();
}

/** Parse a markdown plan into a structured Plan. */
export function parsePlan(
  title: string,
  markdown: string,
): Plan {
  if (!markdown || !markdown.trim()) {
    throw makeError("invalid", "Plan markdown is empty.");
  }
  const sections = splitIntoSections(markdown);
  if (sections.length === 0) {
    throw makeError("invalid", "Plan has no sections.");
  }
  const steps: PlanStep[] = sections.map((section, index) => {
    const id = `s${index + 1}`;
    const body = section.body;
    return {
      id,
      title: section.title,
      body,
      owner: parseOwner(body),
      dependsOn: parseDependsOn(body),
      skills: parseSkills(body),
      tags: parseTags(body),
    };
  });
  const trimmedTitle = title?.trim() || steps[0]?.title || "Untitled Plan";
  return {
    id: slugify(trimmedTitle) + "-" + newId(),
    title: trimmedTitle,
    markdown,
    steps,
    createdAt: new Date().toISOString(),
    dispatchedAt: null,
  };
}

/** Persist a plan to disk under the profile. Returns the plan
 *  with the on-disk id (which may differ from the in-memory id
 *  if the in-memory id collided). */
export function savePlan(plan: Plan, profile?: string): Plan {
  writeJsonAtomic(planJsonPath(plan.id, profile), plan);
  return plan;
}

/** Read a plan back from disk. Throws a `not_found` PlanError
 *  when the plan doesn't exist. */
export function getPlan(id: string, profile?: string): Plan {
  const data = readJsonSafe<Plan>(planJsonPath(id, profile));
  if (!data) {
    throw makeError("not_found", `Plan ${id} not found.`);
  }
  return data;
}

/** List all plans in the profile, sorted by createdAt descending. */
export function listPlans(profile?: string): Plan[] {
  const root = plansRoot(profile);
  if (!existsSync(root)) return [];
  const plans: Plan[] = [];
  try {
    for (const entry of readdirSync(root)) {
      const full = join(root, entry);
      if (!statSync(full).isDirectory()) continue;
      const data = readJsonSafe<Plan>(join(full, "plan.json"));
      if (data) plans.push(data);
    }
  } catch {
    // ignore
  }
  return plans.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Remove a plan and its directory. Returns true if it existed. */
export function deletePlan(id: string, profile?: string): boolean {
  const dir = planDir(id, profile);
  if (!existsSync(dir)) return false;
  try {
    rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/** Convert a PlanStep into a Kanban task body. Mirrors the
 *  format documented in the `kanban-task-shape` skill. */
export function stepToTaskBody(plan: Plan, step: PlanStep): string {
  const lines: string[] = [];
  lines.push(`# ${step.title}`);
  lines.push("");
  lines.push(
    `_Step ${step.id} of plan **${plan.title}** (${plan.steps.length} total)._`,
  );
  lines.push("");
  if (step.body) {
    lines.push(step.body);
    lines.push("");
  }
  if (step.dependsOn.length > 0) {
    lines.push(`**Depends on**: ${step.dependsOn.join(", ")}`);
    lines.push("");
  }
  if (step.skills.length > 0) {
    lines.push(`**Skills**: ${step.skills.join(", ")}`);
    lines.push("");
  }
  if (step.tags.length > 0) {
    lines.push(`**Tags**: ${step.tags.map((t) => "#" + t).join(" ")}`);
    lines.push("");
  }
  lines.push("## Acceptance");
  lines.push("- [ ] The step's body is implemented as described.");
  lines.push("- [ ] The step's tests pass (if any).");
  lines.push("- [ ] The step's docs / changelog are updated.");
  return lines.join("\n");
}

/**
 * Dispatch a plan: for every step, create a Kanban task with the
 * step's body. We deliberately don't run `dispatchOnce` here —
 * that's a separate per-task decision the user makes on the
 * Kanban board. The plan just becomes a backlog of well-shaped
 * tasks.
 *
 * The optional `createTask` callback is injected so tests can
 * run without the real kanban module. It receives
 * `(title, body, skills, maxRetries)` and returns the created
 * task's id.
 */
export interface DispatchDeps {
  createTask: (input: {
    title: string;
    body: string;
    skills: string[];
    maxRetries: number;
  }) => Promise<string>;
}

export async function dispatchPlan(
  id: string,
  deps: DispatchDeps,
  profile?: string,
): Promise<DispatchResult> {
  const plan = getPlan(id, profile);
  const dispatchedAt = new Date().toISOString();
  const stepResults: DispatchResult["stepResults"] = [];
  for (const step of plan.steps) {
    const body = stepToTaskBody(plan, step);
    try {
      const taskId = await deps.createTask({
        title: step.title,
        body,
        skills: step.skills,
        maxRetries: 2,
      });
      stepResults.push({ stepId: step.id, taskId, error: null });
    } catch (err) {
      stepResults.push({
        stepId: step.id,
        taskId: null,
        error: (err as Error).message,
      });
    }
  }
  // Mark the plan as dispatched. The on-disk copy is updated in
  // place so the renderer can immediately see the new state.
  const updated: Plan = { ...plan, dispatchedAt };
  writeJsonAtomic(planJsonPath(plan.id, profile), updated);
  return {
    planId: plan.id,
    dispatchedAt,
    stepResults,
  };
}

/** Validate a Plan structure (useful for tests). */
export function isValidPlan(value: unknown): value is Plan {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Plan>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.markdown === "string" &&
    Array.isArray(v.steps) &&
    v.steps.length > 0 &&
    v.steps.every(
      (s) =>
        s &&
        typeof (s as PlanStep).id === "string" &&
        typeof (s as PlanStep).title === "string" &&
        typeof (s as PlanStep).body === "string" &&
        Array.isArray((s as PlanStep).dependsOn) &&
        Array.isArray((s as PlanStep).skills) &&
        Array.isArray((s as PlanStep).tags),
    )
  );
}
