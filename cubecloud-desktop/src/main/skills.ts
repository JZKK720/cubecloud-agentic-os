import { execFileSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import {
  HERMES_HOME,
  HERMES_PYTHON,
  HERMES_REPO,
  hermesCliArgs,
  getEnhancedPath,
} from "./installer";
import { profileHome } from "./utils";
import { HIDDEN_SUBPROCESS_OPTIONS } from "./process-options";

// Desktop-bundled skills live in `.agents/skills/<name>/SKILL.md` next to
// the cubecloud-desktop workspace. We resolve a few candidate roots so
// the surface picks them up in both dev (cwd) and packaged builds
// (__dirname/../../.agents/skills). Each bundled-skill entry is tagged
// with the source label so the Skills UI can show where it came from.
const DESKTOP_BUNDLED_SKILL_ROOTS: { path: string; source: string }[] = (() => {
  const candidates: string[] = [];
  // Dev / running-from-source: the cwd is the cubecloud-desktop folder.
  candidates.push(resolve(process.cwd(), ".agents", "skills"));
  // Packaged: skills ship next to the app dist; resolve relative to
  // the compiled main bundle location.
  const here = typeof __dirname === "string" ? __dirname : "";
  if (here) {
    for (const rel of [
      "../../../../.agents/skills",
      "../../../.agents/skills",
      "../../.agents/skills",
      "../.agents/skills",
      ".agents/skills",
    ]) {
      candidates.push(resolve(here, rel));
    }
  }
  // Workspace memory note: in some sandboxes the cwd is the repo root,
  // so also try the desktop subfolder explicitly.
  candidates.push(
    resolve(process.cwd(), "cubecloud-desktop", ".agents", "skills"),
  );
  const seen = new Set<string>();
  const out: { path: string; source: string }[] = [];
  for (const path of candidates) {
    if (seen.has(path)) continue;
    seen.add(path);
    if (existsSync(path)) {
      out.push({ path, source: "bundled-desktop" });
    }
  }
  return out;
})();

export interface InstalledSkill {
  name: string;
  category: string;
  description: string;
  path: string;
}

export interface SkillSearchResult {
  name: string;
  description: string;
  category: string;
  source: string;
  installed: boolean;
}

/**
 * Parse SKILL.md frontmatter (YAML between --- markers) for
 * name/description/category. The `category` field is optional and
 * only used for desktop-bundled skills where the file lives directly
 * under `<root>/<skill>/SKILL.md` (no category subfolder).
 */
function parseSkillFrontmatter(content: string): {
  name: string;
  description: string;
  category: string;
} {
  const result = { name: "", description: "", category: "" };

  // Check for YAML frontmatter
  if (!content.startsWith("---")) {
    // Fall back to first heading and first paragraph
    const headingMatch = content.match(/^#\s+(.+)/m);
    if (headingMatch) result.name = headingMatch[1].trim();
    const paraMatch = content.match(/^(?!#)(?!---).+/m);
    if (paraMatch) result.description = paraMatch[0].trim().slice(0, 120);
    return result;
  }

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return result;

  const frontmatter = content.slice(3, endIdx);

  const nameMatch = frontmatter.match(/^\s*name:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (nameMatch) result.name = nameMatch[1].trim();

  const descMatch = frontmatter.match(
    /^\s*description:\s*["']?([^"'\n]+)["']?\s*$/m,
  );
  if (descMatch) result.description = descMatch[1].trim();

  const catMatch = frontmatter.match(
    /^\s*category:\s*["']?([^"'\n]+)["']?\s*$/m,
  );
  if (catMatch) result.category = catMatch[1].trim();

  return result;
}

/**
 * Walk the skills directory to find all installed skills.
 * Structure: skills/<category>/<skill-name>/SKILL.md
 */
export function listInstalledSkills(profile?: string): InstalledSkill[] {
  const skillsDir = join(profileHome(profile), "skills");
  if (!existsSync(skillsDir)) return [];

  const skills: InstalledSkill[] = [];

  try {
    const categories = readdirSync(skillsDir);

    for (const category of categories) {
      const categoryPath = join(skillsDir, category);
      if (!statSync(categoryPath).isDirectory()) continue;

      const entries = readdirSync(categoryPath);
      for (const entry of entries) {
        const entryPath = join(categoryPath, entry);
        if (!statSync(entryPath).isDirectory()) continue;

        const skillFile = join(entryPath, "SKILL.md");
        if (!existsSync(skillFile)) continue;

        try {
          const content = readFileSync(skillFile, "utf-8").slice(0, 4000);
          const meta = parseSkillFrontmatter(content);

          skills.push({
            name: meta.name || entry,
            category,
            description: meta.description || "",
            path: entryPath,
          });
        } catch {
          skills.push({
            name: entry,
            category,
            description: "",
            path: entryPath,
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return skills.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );
}

/**
 * Get the full content of a SKILL.md for the detail view.
 */
export function getSkillContent(skillPath: string): string {
  const skillFile = join(skillPath, "SKILL.md");
  if (!existsSync(skillFile)) return "";

  try {
    return readFileSync(skillFile, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Search the skill registry via the hermes CLI.
 */
export function searchSkills(query: string): SkillSearchResult[] {
  try {
    const output = execFileSync(
      HERMES_PYTHON,
      hermesCliArgs(["skills", "browse", "--query", query, "--json"]),
      {
        cwd: HERMES_REPO,
        env: {
          ...process.env,
          PATH: getEnhancedPath(),
          HOME: homedir(),
          HERMES_HOME,
        },
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
        ...HIDDEN_SUBPROCESS_OPTIONS,
      },
    );

    const text = output.toString().trim();
    if (!text) return [];

    // Try to parse JSON output
    try {
      const results = JSON.parse(text);
      if (Array.isArray(results)) {
        return results.map((r: Record<string, string>) => ({
          name: r.name || "",
          description: r.description || "",
          category: r.category || "",
          source: r.source || "",
          installed: false,
        }));
      }
    } catch {
      // If JSON parsing fails, the CLI may not support --json flag
      // Fall back to listing bundled skills that match
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Get the absolute path of a desktop-bundled skill by its name, or
 * null if not found. Used by the Skills UI to open the SKILL.md in
 * a detail panel without going through the install/uninstall flow.
 */
export function getDesktopBundledSkillPath(name: string): string | null {
  for (const root of DESKTOP_BUNDLED_SKILL_ROOTS) {
    const dir = join(root.path, name);
    const skillFile = join(dir, "SKILL.md");
    if (existsSync(skillFile)) return dir;
  }
  return null;
}

/**
 * Walk a single root that contains `<skill>/SKILL.md` entries (flat, not
 * grouped by category) and return SkillSearchResult rows.
 */
function readFlatBundledRoot(
  root: string,
  source: string,
): SkillSearchResult[] {
  if (!existsSync(root)) return [];
  const out: SkillSearchResult[] = [];
  try {
    const entries = readdirSync(root);
    for (const entry of entries) {
      const entryPath = join(root, entry);
      if (!statSync(entryPath).isDirectory()) continue;
      const skillFile = join(entryPath, "SKILL.md");
      if (!existsSync(skillFile)) continue;
      try {
        const content = readFileSync(skillFile, "utf-8").slice(0, 4000);
        const meta = parseSkillFrontmatter(content);
        out.push({
          name: meta.name || entry,
          description: meta.description || "",
          category: meta.category || "desktop",
          source,
          installed: false,
        });
      } catch {
        out.push({
          name: entry,
          description: "",
          category: "desktop",
          source,
          installed: false,
        });
      }
    }
  } catch {
    // ignore
  }
  return out;
}

/**
 * List bundled skills from the hermes-agent repo plus the desktop's
 * own `.agents/skills/` workspace. The desktop skills (Karpathy
 * Guidelines, design-taste-frontend, electron-pro, hermes-agent,
 * typescript-expert) are repo-local SKILL.md files that ship with
 * the cubecloud-desktop workspace and should be visible in the
 * Skills surface alongside any hermes-bundled skills.
 */
export function listBundledSkills(): SkillSearchResult[] {
  const skills: SkillSearchResult[] = [];

  // 1) hermes-agent bundled tree: <HERMES_REPO>/skills/<category>/<skill>/SKILL.md
  const hermesRoot = join(HERMES_REPO, "skills");
  if (existsSync(hermesRoot)) {
    try {
      const categories = readdirSync(hermesRoot);
      for (const category of categories) {
        const catPath = join(hermesRoot, category);
        if (!statSync(catPath).isDirectory()) continue;
        const entries = readdirSync(catPath);
        for (const entry of entries) {
          const entryPath = join(catPath, entry);
          if (!statSync(entryPath).isDirectory()) continue;
          const skillFile = join(entryPath, "SKILL.md");
          if (!existsSync(skillFile)) continue;
          try {
            const content = readFileSync(skillFile, "utf-8").slice(0, 4000);
            const meta = parseSkillFrontmatter(content);
            skills.push({
              name: meta.name || entry,
              description: meta.description || "",
              category,
              source: "bundled",
              installed: false,
            });
          } catch {
            skills.push({
              name: entry,
              description: "",
              category,
              source: "bundled",
              installed: false,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2) desktop-bundled skills: <workspace>/.agents/skills/<skill>/SKILL.md
  for (const root of DESKTOP_BUNDLED_SKILL_ROOTS) {
    skills.push(...readFlatBundledRoot(root.path, root.source));
  }

  return skills.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );
}

/**
 * Failure markers seen in `hermes skills install/uninstall` stdout when the
 * CLI exits 0 despite the operation having failed. Observed live against
 * Hermes Agent v0.14.0 (2026.5.16) on 2026-05-22:
 *
 *   $ hermes skills install concept-diagram --yes
 *   Resolving 'concept-diagram'...
 *   No exact match for 'concept-diagram'. Did you mean one of these?
 *     concept-diagrams - official/creative/concept-diagrams
 *   $ echo $?    -> 0
 *
 * Without this classifier the desktop would trust the 0 exit and report
 * a successful install, leaving the user with a button that flashed and
 * did nothing (issue #310).
 */
const SKILL_CLI_FAILURE_MARKERS: readonly RegExp[] = [
  /\bNo exact match for\b/,
  /\bNo skill named\b/,
  /^Error:/m,
];

export interface SkillCliResult {
  success: boolean;
  error?: string;
}

/**
 * Classify the combined output of `hermes skills install/uninstall` after
 * the subprocess has exited 0. The CLI exits 0 even on resolution failure
 * (issue #310), so the exit code alone is not enough. When a known failure
 * marker is present, surface the message (minus the leading
 * "Resolving '...'" progress line) as `error` so the renderer can display
 * it; otherwise treat the operation as successful.
 *
 * Pure — no I/O, no globals — so it is cheap to unit-test exhaustively.
 */
export function classifySkillCliOutput(
  stdout: string,
  stderr: string = "",
): SkillCliResult {
  const combined = `${stdout}\n${stderr}`;
  if (SKILL_CLI_FAILURE_MARKERS.some((re) => re.test(combined))) {
    return { success: false, error: extractSkillCliMessage(combined) };
  }
  return { success: true };
}

function extractSkillCliMessage(output: string): string {
  // Strip the leading "Resolving '<name>'..." progress line — pure noise
  // for the user. Keep the rest verbatim so suggestions like
  // "Did you mean concept-diagrams" reach the renderer.
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^Resolving '.*'\.\.\.$/.test(l));
  return lines.join("\n").trim() || output.trim();
}

export function installSkill(
  identifier: string,
  profile?: string,
): SkillCliResult {
  try {
    const args = hermesCliArgs(["skills", "install", identifier, "--yes"]);
    if (profile && profile !== "default") {
      args.splice(process.platform === "win32" ? 2 : 1, 0, "-p", profile);
    }

    const stdout = execFileSync(HERMES_PYTHON, args, {
      cwd: HERMES_REPO,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
        HOME: homedir(),
        HERMES_HOME,
      },
      stdio: "pipe",
      timeout: 60000,
      ...HIDDEN_SUBPROCESS_OPTIONS,
    });
    // Exit 0 alone is not proof of success — the CLI exits 0 on resolution
    // failure too. Inspect the captured stdout for known failure markers
    // (issue #310).
    return classifySkillCliOutput(stdout?.toString() ?? "");
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const msg = (e.stderr?.toString() || e.message || "").trim();
    return {
      success: false,
      error: msg || e.stdout?.toString()?.trim() || "Install failed.",
    };
  }
}

export function uninstallSkill(name: string, profile?: string): SkillCliResult {
  try {
    const args = hermesCliArgs(["skills", "uninstall", name]);
    if (profile && profile !== "default") {
      args.splice(process.platform === "win32" ? 2 : 1, 0, "-p", profile);
    }

    const stdout = execFileSync(HERMES_PYTHON, args, {
      cwd: HERMES_REPO,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
        HOME: homedir(),
        HERMES_HOME,
      },
      stdio: "pipe",
      timeout: 30000,
      ...HIDDEN_SUBPROCESS_OPTIONS,
    });
    // Same exit-0-on-failure shape as install (#310) — classify the
    // captured output before claiming success.
    return classifySkillCliOutput(stdout?.toString() ?? "");
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const msg = (e.stderr?.toString() || e.message || "").trim();
    return {
      success: false,
      error: msg || e.stdout?.toString()?.trim() || "Uninstall failed.",
    };
  }
}
