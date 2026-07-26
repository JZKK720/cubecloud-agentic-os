import { execFileSync, execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  mkdirSync,
  cpSync,
  rmSync,
} from "fs";
import { join, resolve, basename } from "path";
import { homedir, tmpdir } from "os";
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
// the agent-desktop workspace. We resolve a few candidate roots so
// the surface picks them up in both dev (cwd) and packaged builds
// (__dirname/../../.agents/skills). Each bundled-skill entry is tagged
// with the source label so the Skills UI can show where it came from.
const DESKTOP_BUNDLED_SKILL_ROOTS: { path: string; source: string }[] = (() => {
  const candidates: string[] = [];
  // Dev / running-from-source: the cwd is the agent-desktop folder.
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
    resolve(process.cwd(), "agent-desktop", ".agents", "skills"),
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
 * the agent-desktop workspace and should be visible in the
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
 * Pure —no I/O, no globals —so it is cheap to unit-test exhaustively.
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

/**
 * SkillSpector scan result. Mirrors the tool's exit-code contract:
 *   0 → safe (pass)
 *   1 → do_not_install (hard block)
 *   2 → error (investigate before retrying —also blocks)
 */
export interface SkillScanResult {
  /** true when the skill passed the scan (exit 0). */
  safe: boolean;
  /** Human-readable verdict from the scanner output, if parseable. */
  summary?: string;
  /** Exit code from the `skillspector scan` subprocess. */
  exitCode: number;
}

/**
 * Run `skillspector scan --no-llm` on a skill directory and classify the
 * exit code. This is the security hard-gate that the cubecloud-skilldbundle
 * setup proved out: every skill is scanned before it is allowed to stay on
 * the machine. Exit 1 = do_not_install (hard block). Exit 2 = error (also
 * blocks —investigate before retrying). Exit 0 = safe.
 *
 * `scanSkillWithSkillspector` is the I/O wrapper (spawns the subprocess);
 * `classifySkillScanExitCode` is the pure classifier (unit-testable without
 * a real `skillspector` binary on PATH).
 *
 * When `skillspector` is not on PATH (ENOENT), the scan is skipped with
 * `safe: true` and a summary noting the tool was unavailable. This keeps
 * the desktop functional on machines that haven't installed the scanner —
 * the gate is a defense-in-depth layer, not a hard prerequisite for using
 * the Skills surface. Operators who want the gate enforced should install
 * `skillspector` (it is already in the bundled MCP registry).
 */
export function classifySkillScanExitCode(
  exitCode: number,
  stdout: string,
  stderr: string,
): SkillScanResult {
  void stderr; // captured for completeness; verdict is exit-code driven
  const summary = extractSkillScanSummary(stdout);
  if (exitCode === 0) return { safe: true, summary, exitCode };
  // Exit 1 = do_not_install, exit 2 = error. Both block.
  return {
    safe: false,
    summary:
      summary ||
      (exitCode === 1
        ? "SkillSpector verdict: do_not_install"
        : `SkillSpector error (exit ${exitCode})`),
    exitCode,
  };
}

/**
 * Extract the last meaningful line(s) from `skillspector scan` stdout as a
 * human-readable summary. The tool prints a verdict table; the last 1-3
 * non-empty lines are the actionable summary.
 */
function extractSkillScanSummary(stdout: string): string | undefined {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return undefined;
  // Keep the last 3 lines —enough for the verdict + risk score + note.
  return lines.slice(-3).join("\n");
}

/**
 * Resolve the on-disk directory of a freshly-installed skill so the
 * SkillSpector gate can scan it. Hermes installs skills under
 * `<profileHome>/skills/<category>/<skill-name>/`. We search the skills
 * tree for a directory whose name matches the `identifier` (last path
 * segment) and return the first match. Returns null if not found.
 *
 * Pure-ish: reads the filesystem but does not mutate it. Exported for unit
 * testing.
 */
export function findInstalledSkillDir(
  identifier: string,
  profile?: string,
): string | null {
  const skillsDir = join(profileHome(profile), "skills");
  if (!existsSync(skillsDir)) return null;
  // The identifier may be a simple name ("demo") or a category/name
  // ("creative/concept-diagrams"). We match on the last segment.
  const lastSeg = identifier.split("/").pop()?.trim() || identifier;
  try {
    for (const category of readdirSync(skillsDir)) {
      const categoryPath = join(skillsDir, category);
      if (!statSync(categoryPath).isDirectory()) continue;
      for (const entry of readdirSync(categoryPath)) {
        const entryPath = join(categoryPath, entry);
        if (!statSync(entryPath).isDirectory()) continue;
        if (entry === lastSeg) return entryPath;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Run `skillspector scan --no-llm <dir>` and return the classified result.
 * If `skillspector` is not on PATH, returns `{ safe: true, skipped: true }`
 * so the install proceeds without a hard failure (defense-in-depth, not a
 * prerequisite). Exported for unit testing with a stubbed exec.
 */
export function scanSkillWithSkillspector(
  skillDir: string,
): SkillScanResult {
  try {
    const stdout = execFileSync(
      "skillspector",
      ["scan", skillDir, "--no-llm"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
        env: { ...process.env, PYTHONUTF8: "1" },
        ...HIDDEN_SUBPROCESS_OPTIONS,
      },
    );
    return classifySkillScanExitCode(0, stdout?.toString() ?? "", "");
  } catch (err) {
    const e = err as {
      status?: number;
      stdout?: Buffer;
      stderr?: Buffer;
      code?: string;
    };
    // ENOENT —skillspector not installed. Skip the gate (defense-in-depth).
    if (e.code === "ENOENT") {
      return {
        safe: true,
        summary: "SkillSpector not found on PATH —scan skipped",
        exitCode: -1,
      };
    }
    const exitCode = typeof e.status === "number" ? e.status : 2;
    const out = e.stdout?.toString() ?? "";
    const errText = e.stderr?.toString() ?? "";
    return classifySkillScanExitCode(exitCode, out, errText);
  }
}

function extractSkillCliMessage(output: string): string {
  // Strip the leading "Resolving '<name>'..." progress line —pure noise
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
    // Exit 0 alone is not proof of success —the CLI exits 0 on resolution
    // failure too. Inspect the captured stdout for known failure markers
    // (issue #310).
    const cliResult = classifySkillCliOutput(stdout?.toString() ?? "");
    if (!cliResult.success) return cliResult;

    // ── SkillSpector hard gate (post-install) ──────────────────────
    // The Hermes CLI has copied the skill to disk. Before we declare
    // success, scan the installed directory with SkillSpector. If the
    // verdict is do_not_install (exit 1) or error (exit 2), uninstall
    // the skill and return failure. This mirrors the security gate
    // proven in the cubecloud-skilldbundle-setup installer: no skill
    // lands without a passing scan.
    const skillDir = findInstalledSkillDir(identifier, profile);
    if (skillDir) {
      const scan = scanSkillWithSkillspector(skillDir);
      if (!scan.safe) {
        // Block: uninstall the skill we just installed so the machine
        // is not left with a known-malicious skill on disk.
        uninstallSkill(identifier, profile);
        return {
          success: false,
          error:
            scan.summary ||
            `SkillSpector blocked this skill (exit ${scan.exitCode}). It has been uninstalled.`,
        };
      }
    }
    // If skillDir is null (Hermes installed somewhere we didn't find) or
    // skillspector is not on PATH (scan.safe=true with exitCode -1), we
    // proceed —the gate is defense-in-depth, not a hard prerequisite.
    return { success: true };
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const msg = (e.stderr?.toString() || e.message || "").trim();
    return {
      success: false,
      error: msg || e.stdout?.toString()?.trim() || "Install failed.",
    };
  }
}

/**
 * Install a skill from a git URL. Clones the repo to a temp dir,
 * finds the SKILL.md, runs the SkillSpector hard gate, and copies
 * the skill to the profile skills directory.
 *
 * This extends the skill-install path beyond Hermes's built-in
 * registry — users can paste any git URL (e.g.
 * "https://github.com/obra/superpowers") and the desktop will
 * clone, scan, and install the skill.
 *
 * @param gitUrl  The git URL to clone (https://, git://, or
 *                owner/repo shorthand).
 * @param skillName  The skill folder name to install. If omitted,
 *                   the repo name is used.
 * @param skillRelPath  Relative path inside the repo to the skill
 *                      folder containing SKILL.md. Default:
 *                      "skills/<name>".
 * @param profile  Optional Hermes profile name.
 */
export function installSkillFromGitUrl(
  gitUrl: string,
  skillName?: string,
  skillRelPath?: string,
  profile?: string,
): SkillCliResult {
  // Normalize the URL: owner/repo → https://github.com/owner/repo.git
  let url = gitUrl.trim();
  if (!url.startsWith("http") && !url.startsWith("git@")) {
    url = `https://github.com/${url}.git`;
  }

  // Derive the skill name from the URL if not provided.
  const name =
    skillName?.trim() ||
    basename(url.replace(/\.git$/, ""));

  // Derive the relative path if not provided.
  const relPath = skillRelPath?.trim() || `skills/${name}`;

  // Clone to a temp dir.
  const tmpClone = join(
    tmpdir(),
    `skill_install_${Date.now()}_${name}`,
  );

  try {
    execSync(`git clone --depth 1 "${url}" "${tmpClone}"`, {
      encoding: "utf8",
      timeout: 60_000,
      stdio: "pipe",
      env: { ...process.env, PATH: getEnhancedPath() },
      ...HIDDEN_SUBPROCESS_OPTIONS,
    });
  } catch (err) {
    const e = err as { stderr?: Buffer; message?: string };
    return {
      success: false,
      error: `git clone failed: ${(e.stderr?.toString() || e.message || "").slice(0, 200)}`,
    };
  }

  // Find the skill folder.
  const skillDir = join(tmpClone, relPath);
  if (!existsSync(join(skillDir, "SKILL.md"))) {
    // Try the repo root as fallback.
    const rootSkill = join(tmpClone, "SKILL.md");
    if (existsSync(rootSkill)) {
      // The skill is at the repo root.
    } else {
      rmSync(tmpClone, { recursive: true, force: true });
      return {
        success: false,
        error: `SKILL.md not found at ${relPath} or repo root. Use the skillRelPath parameter to specify the correct path.`,
      };
    }
  }

  const actualSkillDir = existsSync(join(skillDir, "SKILL.md"))
    ? skillDir
    : tmpClone;

  // ── SkillSpector hard gate ──────────────────────────
  const scan = scanSkillWithSkillspector(actualSkillDir);
  if (!scan.safe) {
    rmSync(tmpClone, { recursive: true, force: true });
    return {
      success: false,
      error:
        scan.summary ||
        `SkillSpector blocked this skill (exit ${scan.exitCode}). The clone has been removed.`,
    };
  }

  // Copy to the profile skills directory.
  const destDir = join(profileHome(profile), "skills", name);
  try {
    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true });
    }
    mkdirSync(destDir, { recursive: true });
    cpSync(actualSkillDir, destDir, { recursive: true });
  } catch (err) {
    rmSync(tmpClone, { recursive: true, force: true });
    return {
      success: false,
      error: `Failed to copy skill: ${(err as Error).message?.slice(0, 200)}`,
    };
  }

  // Cleanup the temp clone.
  rmSync(tmpClone, { recursive: true, force: true });

  return { success: true };
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
    // Same exit-0-on-failure shape as install (#310) —classify the
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
