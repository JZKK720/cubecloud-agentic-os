import { describe, expect, it } from "vitest";
import {
  checkCareful,
  findDestructiveCommandInBody,
  isDestructive,
} from "../src/main/safety";

/**
 * V2 Step 9 — careful TS module.
 *
 * The careful hook is a pure pattern-matcher; these tests
 * pin the verdict for the destructive / safe / boundary cases
 * the renderer and plans-dispatcher rely on.
 */

describe("safety.checkCareful — destructive patterns", () => {
  it.each([
    ["rm -rf /var/data", "rm-recursive"],
    ["rm -fr /var/data", "rm-recursive"],
    ["rm -Rf /var/data", "rm-recursive"],
    ["sudo rm -rf --no-preserve-root /", "rm-recursive"],
    ["DROP TABLE users;", "drop-table"],
    ["drop database prod;", "drop-table"],
    ["DROP SCHEMA public CASCADE;", "drop-table"],
    ["TRUNCATE orders;", "truncate"],
    ["git push --force origin main", "git-push-force"],
    ["git push -f origin main", "git-push-force"],
    ["git push --force-with-lease origin main", "git-push-force"],
    ["git reset --hard HEAD~3", "git-reset-hard"],
    ["git checkout .", "git-checkout-all"],
    ["git restore .", "git-checkout-all"],
    ["git clean -fd", "git-clean-fd"],
    ["git clean -fdx", "git-clean-fd"],
    ["kubectl delete pod web-1", "kubectl-delete"],
    ["docker system prune -a", "docker-system-prune"],
    ["docker rm -f web-1", "docker-rm-force"],
    ["chmod -R 000 /etc", "chmod-recursive-root"],
    ["dd if=/dev/zero of=/dev/sda", "mkfs-or-dd-device"],
    ["mkfs.ext4 /dev/sda1", "mkfs-or-dd-device"],
  ])("flags %s as %s", (command, expectedPattern) => {
    const result = checkCareful(command);
    expect(result.verdict).not.toBe("safe");
    expect(result.matchedPattern).toBe(expectedPattern);
  });
});

describe("safety.checkCareful — safe exceptions", () => {
  it.each([
    "rm -rf node_modules",
    "rm -rf .next",
    "rm -rf dist",
    "rm -rf build",
    "rm -rf coverage",
    "rm -rf .cache",
    "rm -rf .turbo",
    "rm -rf __pycache__",
    "rm -rf target",
    "rm -rf .vite",
    "rm -rf out",
    "git push origin main",
    "git push",
    "git push -u origin feature/x",
    "git reset --soft HEAD~1",
    "git reset --mixed HEAD~1",
    "kubectl delete pod web-1 --dry-run=server",
    "docker rm web-1",
    "git clean -fd && git checkout -- .",
  ])("allows %s", (command) => {
    const result = checkCareful(command);
    expect(result.verdict).toBe("safe");
  });
});

describe("safety.checkCareful — verdict semantics", () => {
  it("returns safe for an empty string", () => {
    expect(checkCareful("").verdict).toBe("safe");
  });

  it("returns safe for non-string input", () => {
    // Defensive: the renderer always sends a string, but
    // tests for the public API behaviour.
    expect(checkCareful(undefined as unknown as string).verdict).toBe("safe");
    expect(checkCareful(null as unknown as string).verdict).toBe("safe");
  });

  it("returns safe for a harmless read-only command", () => {
    expect(checkCareful("ls -la").verdict).toBe("safe");
    expect(checkCareful("git status").verdict).toBe("safe");
    expect(checkCareful("npm test").verdict).toBe("safe");
    expect(checkCareful("cat package.json").verdict).toBe("safe");
  });

  it("includes a reason on warn", () => {
    const result = checkCareful("rm -rf /var/data");
    expect(result.verdict).toBe("warn");
    expect(result.reason).toBeTruthy();
  });

  it("includes a softer alternative on warn when available", () => {
    const result = checkCareful("rm -rf /var/data");
    expect(result.softerAlternative).toBeTruthy();
  });

  it("uses block severity for chmod-recursive-root and mkfs", () => {
    expect(checkCareful("chmod -R 000 /etc").verdict).toBe("block");
    expect(checkCareful("dd if=/dev/zero of=/dev/sda").verdict).toBe("block");
  });

  it("does not match relative paths for chmod-recursive-root", () => {
    // Only matches absolute system paths, not `./build`.
    expect(checkCareful("chmod -R 755 ./build").verdict).toBe("safe");
  });
});

describe("safety.isDestructive — boolean convenience", () => {
  it("returns true for destructive commands", () => {
    expect(isDestructive("rm -rf /var/data")).toBe(true);
    expect(isDestructive("git push -f origin main")).toBe(true);
  });

  it("returns false for safe commands", () => {
    expect(isDestructive("ls -la")).toBe(false);
    expect(isDestructive("git status")).toBe(false);
  });
});

describe("safety.findDestructiveCommandInBody — plan body scanner", () => {
  it("returns null when the body has no code fence", () => {
    const body = "Just regular prose, no code blocks at all.";
    expect(findDestructiveCommandInBody(body)).toBeNull();
  });

  it("returns null when the fenced command is safe", () => {
    const body = "Run the tests:\n\n```sh\nnpm test\n```\n";
    expect(findDestructiveCommandInBody(body)).toBeNull();
  });

  it("returns the destructive line when a fence contains one", () => {
    const body =
      "Clean up before the build:\n\n```bash\nrm -rf /var/data\nnpm run build\n```\n";
    expect(findDestructiveCommandInBody(body)).toBe("rm -rf /var/data");
  });

  it("ignores comment lines inside the fence", () => {
    const body = "```sh\n# rm -rf /var/data — this is a comment\nls\n```";
    expect(findDestructiveCommandInBody(body)).toBeNull();
  });

  it("handles CRLF line endings", () => {
    const body = "```bash\r\nrm -rf /var/data\r\nls\r\n```\r\n";
    expect(findDestructiveCommandInBody(body)).toBe("rm -rf /var/data");
  });

  it("scans multiple fences and returns the first destructive hit", () => {
    const body =
      "```sh\nnpm test\n```\n\nThen deploy:\n\n```bash\ngit push -f origin main\n```\n";
    expect(findDestructiveCommandInBody(body)).toBe("git push -f origin main");
  });

  it("recognises ``` (no language tag) fences", () => {
    const body = "```\nrm -rf /var/data\n```";
    expect(findDestructiveCommandInBody(body)).toBe("rm -rf /var/data");
  });
});
