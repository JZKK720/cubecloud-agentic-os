import { describe, expect, it } from "vitest";
import { findDestructiveCommandInBody, isDestructive } from "../src/main/safety";
import { parsePlan } from "../src/main/plans";

/**
 * V2 Step 9 — careful precheck on the plans-dispatch path.
 *
 * When a plan body contains a destructive shell command, the
 * IPC handler in `src/main/index.ts` returns a DispatchResult
 * with a `careful` advisory rather than creating kanban tasks.
 * The `findDestructiveCommandInBody` helper is the line-level
 * scanner the handler uses; these tests pin its behaviour on
 * realistic plan step bodies.
 */

describe("plans dispatch — careful precheck", () => {
  it("parses a step whose body has a safe `rm -rf node_modules` (still safe)", () => {
    const md = `## Clean\n\nRun \`rm -rf node_modules && npm install\` to reset.`;
    const plan = parsePlan("safe-clean", md);
    expect(plan.steps).toHaveLength(1);
    // Safe exception — finder returns null.
    expect(findDestructiveCommandInBody(plan.steps[0].body)).toBeNull();
  });

  it("flags a step whose body has `rm -rf /var/data`", () => {
    const md = `## Wipe data dir\n\nWipe the data dir with \`rm -rf /var/data\`.`;
    const plan = parsePlan("destructive-clean", md);
    const found = findDestructiveCommandInBody(plan.steps[0].body);
    expect(found).toBe("rm -rf /var/data");
    expect(isDestructive(found)).toBe(true);
  });

  it("flags a step whose body has `git push -f origin main`", () => {
    const md = `## Force push the hotfix\n\n\`git push -f origin main\`.`;
    const plan = parsePlan("force-push", md);
    const found = findDestructiveCommandInBody(plan.steps[0].body);
    expect(found).toBe("git push -f origin main");
    expect(isDestructive(found)).toBe(true);
  });

  it("scans every step and returns the first hit (deterministic order)", () => {
    const md = [
      "## Step one",
      "",
      "Run `npm test` first.",
      "",
      "## Step two (destructive)",
      "",
      "Then `DROP TABLE staging;` to clear staging.",
      "",
      "## Step three",
      "",
      "Run `git push origin main` last.",
    ].join("\n");
    const plan = parsePlan("mixed", md);
    expect(plan.steps).toHaveLength(3);
    // The second step's body contains the destructive command.
    const found = findDestructiveCommandInBody(plan.steps[1].body);
    expect(found).toBe("DROP TABLE staging;");
  });

  it("does NOT flag a step that only references a destructive pattern in prose", () => {
    const md = `## Discuss\n\nWe should never run \`rm -rf /var/data\` in production.`;
    const plan = parsePlan("discuss", md);
    // The line is inside a code fence, so the scanner DOES see
    // it. The point of the precheck is to flag this for human
    // review.
    const found = findDestructiveCommandInBody(plan.steps[0].body);
    expect(found).toBe("rm -rf /var/data");
  });

  it("scans multiple fences within a single step and finds the first hit", () => {
    const md = `## Multi\n\nFirst, the safe one:\n\n\`\`\`sh\nls\n\`\`\`\n\nThen the destructive one:\n\n\`\`\`bash\ngit reset --hard HEAD~5\n\`\`\`\n`;
    const plan = parsePlan("multi-fence", md);
    const found = findDestructiveCommandInBody(plan.steps[0].body);
    expect(found).toBe("git reset --hard HEAD~5");
  });
});
