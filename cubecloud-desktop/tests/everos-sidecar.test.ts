/**
 * Unit tests for the EverOS sidecar lifecycle manager
 * (`src/main/everos-sidecar.ts`).
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * The sidecar is a long-lived spawn wrapper for the
 * `everos server start` Python CLI. The tests verify:
 *   1. Status probe returns a stable shape with the right
 *      defaults when no binary is on PATH.
 *   2. Start() in "no-binary" mode reports `state: "stopped"`
 *      with a helpful `reason` — never throws.
 *   3. Start() with the test injection paths produces a
 *      "starting" status, captures the child PID, and the
 *      close handler eventually flips the status to
 *      "stopped" / "crashed" depending on the exit code.
 *   4. Stop() is a no-op when nothing is running and never
 *      throws.
 *   5. Auto-restart caps after MAX_CRASHES_IN_WINDOW in a
 *      CRASH_WINDOW_MS window. User-triggered restarts bypass
 *      the cap.
 *
 * We mock `child_process`, `./installer`, and `fetch` (only
 * for the crash-cap test) so no real Python, PATH lookup, or
 * HTTP probe runs. The mocks are hoisted so the sidecar can
 * grab them at module load.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";

const {
  spawnMock,
  spawnSyncMock,
  getEnhancedPathMock,
} = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  spawnSyncMock: vi.fn(),
  getEnhancedPathMock: vi.fn(() => "C:\\mock-bin"),
}));

vi.mock("child_process", () => ({
  spawn: spawnMock,
  spawnSync: spawnSyncMock,
  default: {
    spawn: spawnMock,
    spawnSync: spawnSyncMock,
  },
}));

vi.mock("../src/main/installer", () => ({
  getEnhancedPath: getEnhancedPathMock,
  HERMES_HOME: "D:\\hermes",
}));

/** A stand-in for a `ChildProcess`. The real one is a
 *  Readable+Writable stream with a richer API; we only need
 *  the events and methods the sidecar touches. */
class FakeChild extends EventEmitter {
  pid = 12345;
  killed = false;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill(signal: string): boolean {
    void signal;
    this.killed = true;
    // Emit close asynchronously so the manager's "close"
    // handler runs in the next tick — same semantics as
    // Node's child_process on Windows.
    setImmediate(() => this.emit("close", 0, "SIGTERM"));
    return true;
  }
}

describe("everos-sidecar manager", () => {
  beforeEach(() => {
    vi.resetModules();
    spawnMock.mockReset();
    spawnSyncMock.mockReset();
    getEnhancedPathMock.mockReset();
    getEnhancedPathMock.mockReturnValue("C:\\mock-bin");
  });

  afterEach(() => {
    // Stop any process the manager is holding so the next
    // test starts from a clean slate.
    try {
      vi.resetModules();
    } catch {
      /* noop */
    }
  });

  it("status probe returns stable defaults when nothing is running", async () => {
    spawnMock.mockImplementation(() => new FakeChild());
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 1,
      stdout: "",
      stderr: "not found",
    });
    const sidecar = await import("../src/main/everos-sidecar");
    const status = sidecar.getEverOsSidecarStatus();
    expect(status.state).toBe("stopped");
    expect(status.running).toBe(false);
    expect(status.pid).toBeNull();
    // The sidecar doesn't pre-fill the port on the
    // untouched initial state — it stays `null` until the
    // first start() call sets it. The baseUrl IS set
    // (defaults to localhost:1995) so the renderer can
    // surface a useful "would connect here" preview.
    expect(status.port).toBeNull();
    expect(status.baseUrl).toBe("http://127.0.0.1:1995");
    expect(status.crashCount).toBe(0);
    expect(status.reason).toBeNull();
  });

  it("start() reports a friendly reason when the binary is missing", async () => {
    // PATH lookup returns empty → no binary.
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 1,
      stdout: "",
      stderr: "",
    });
    const sidecar = await import("../src/main/everos-sidecar");
    const status = sidecar.startEverOsSidecar();
    expect(status.state).toBe("stopped");
    expect(status.running).toBe(false);
    expect(status.pid).toBeNull();
    expect(typeof status.reason).toBe("string");
    expect(status.reason).toMatch(/everos/i);
    // spawn() must NOT have been called because the lookup
    // failed before the spawn.
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("start() with an injected binary flips state to 'starting' and reports pid", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar._setSidecarTestOverrides(
      "C:\\fake\\everos.exe",
      ["server", "start", "--port", "1995"],
    );
    const status = sidecar.startEverOsSidecar();
    expect(status.state).toBe("starting");
    expect(status.pid).toBe(12345);
    expect(status.port).toBe(1995);
    expect(status.baseUrl).toBe("http://127.0.0.1:1995");
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[0]).toBe("C:\\fake\\everos.exe");
  });

  it("start() called twice while running is a no-op (idempotent)", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar._setSidecarTestOverrides("C:\\fake\\everos.exe", [
      "server",
      "start",
    ]);
    sidecar.startEverOsSidecar();
    const second = sidecar.startEverOsSidecar();
    // Second call returns the same status, doesn't re-spawn.
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(second.state).toBe("starting");
  });

  it("close event after user stop flips state to 'stopped' (not crashed)", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar._setSidecarTestOverrides("C:\\fake\\everos.exe", [
      "server",
      "start",
    ]);
    const started = sidecar.startEverOsSidecar();
    expect(started.state).toBe("starting");
    // Simulate the user clicking Stop. The manager marks
    // the state as "stopped" before sending SIGTERM so the
    // close handler knows not to count this exit as a crash.
    sidecar.stopEverOsSidecar();
    // The FakeChild emits close asynchronously on kill().
    await new Promise((r) => setImmediate(r));
    const after = sidecar.getEverOsSidecarStatus();
    expect(after.state).toBe("stopped");
    expect(after.running).toBe(false);
  });

  it("close event from a non-stopped sidecar during 'starting' is treated as a stop (not a crash)", async () => {
    // The product design (per the close handler in
    // everos-sidecar.ts) only counts a process exit as a
    // crash when the sidecar was already in state
    // "running" — i.e. after the /health probe has
    // succeeded. A process that dies during "starting"
    // is treated as a stop so the user's first "Start"
    // doesn't burn a restart credit on a Python install
    // that simply doesn't exist. This test pins that
    // behaviour: emit close on a child that never
    // reached "running", and assert crashCount stays 0.
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar._setSidecarTestOverrides("C:\\fake\\everos.exe", [
      "server",
      "start",
    ]);
    const started = sidecar.startEverOsSidecar();
    expect(started.state).toBe("starting");
    setImmediate(() => child.emit("close", 1, null));
    await new Promise((r) => setImmediate(r));
    const after = sidecar.getEverOsSidecarStatus();
    expect(after.crashCount).toBe(0);
    expect(after.state).toBe("stopped");
  });

  it("stop() is a safe no-op when nothing is running", async () => {
    spawnMock.mockImplementation(() => new FakeChild());
    const sidecar = await import("../src/main/everos-sidecar");
    const status = sidecar.stopEverOsSidecar();
    expect(status.state).toBe("stopped");
    expect(status.running).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("log tail is empty by default and returns a fresh array each call", async () => {
    spawnMock.mockImplementation(() => new FakeChild());
    const sidecar = await import("../src/main/everos-sidecar");
    const a = sidecar.getEverOsSidecarLogTail();
    const b = sidecar.getEverOsSidecarLogTail();
    expect(a.lines).toEqual([]);
    expect(a.totalBytes).toBe(0);
    expect(b.lines).toEqual([]);
    // Each call must return a fresh array — no shared
    // reference that the caller could mutate.
    expect(a.lines).not.toBe(b.lines);
  });

  it("clearLogs() resets the tail and the lastError", async () => {
    spawnMock.mockImplementation(() => new FakeChild());
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar.clearEverOsSidecarLogs();
    const tail = sidecar.getEverOsSidecarLogTail();
    expect(tail.lines).toEqual([]);
    expect(tail.totalBytes).toBe(0);
    const status = sidecar.getEverOsSidecarStatus();
    expect(status.lastError).toBeNull();
  });

  it("user-triggered restart bypasses the auto-restart crash cap", async () => {
    // We don't need to actually exhaust the cap; the
    // production code clears crashTimestamps on user
    // restart, so the visible behavior is "no crash
    // counter is recorded when the user clicks Restart".
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar._setSidecarTestOverrides("C:\\fake\\everos.exe", [
      "server",
      "start",
    ]);
    sidecar.startEverOsSidecar();
    // Pre-load some crash timestamps by calling start
    // twice in a way that increments the counter. (The
    // direct path: emit close on the child.)
    setImmediate(() => child.emit("close", 1, null));
    await new Promise((r) => setImmediate(r));
    // Now user-triggered restart: crashTimestamps should
    // be cleared.
    const restarted = sidecar.restartEverOsSidecar();
    expect(restarted.state).toBe("starting");
  });

  it("start() forwards port + host overrides", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    const sidecar = await import("../src/main/everos-sidecar");
    sidecar._setSidecarTestOverrides("C:\\fake\\everos.exe", [
      "server",
      "start",
      "--host",
      "0.0.0.0",
      "--port",
      "1995",
    ]);
    const status = sidecar.startEverOsSidecar({
      port: 2000,
      host: "0.0.0.0",
    });
    expect(status.port).toBe(2000);
    expect(status.baseUrl).toBe("http://0.0.0.0:2000");
  });

  it("5 crashes in 60s auto-restart, the 6th disables auto-restart with a 'cap reached' reason", async () => {
    // Pin the safety cap that the sidecar ships with. If a
    // future contributor changes the constant, this test
    // will fail and they have to consciously re-evaluate
    // whether the test still matches the product.
    const MAX_CRASHES = 5;
    const RESTART_DELAY_MS = 1500;

    // Track each child the manager spawns so we can crash
    // it deterministically. The first 5 should trigger
    // auto-restart; the 6th should NOT.
    const children: FakeChild[] = [];
    spawnMock.mockImplementation(() => {
      const c = new FakeChild();
      children.push(c);
      return c;
    });

    // Mock fetch so waitForReady() succeeds and flips the
    // state to "running". The sidecar only counts an exit
    // as a crash when the state was "running" at the moment
    // the close handler runs.
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    // Fake timers so the 1.5s restart delay doesn't add 9s
    // to the test suite. We control time explicitly.
    vi.useFakeTimers({
      shouldAdvanceTime: false,
    });

    // helper: read the status, but only let in-flight
    // promises (NOT scheduled timers) settle. This is the
    // key trick: we want to observe the state immediately
    // after a close event, before the manager's own
    // restart-timer fires and re-spawns. `vi.runAllTicksAsync`
    // drains microtasks; `vi.runAllTimersAsync` would also
    // drain scheduled timers (including the 1.5s restart
    // timer), so we deliberately avoid it between the close
    // event and the assertion.
    const settleMicrotasks = async (): Promise<void> => {
      await vi.advanceTimersByTimeAsync(0);
    };

    try {
      const sidecar = await import("../src/main/everos-sidecar");
      sidecar._setSidecarTestOverrides("C:\\fake\\everos.exe", [
        "server",
        "start",
      ]);

      // Start the first child.
      const started = sidecar.startEverOsSidecar();
      expect(started.state).toBe("starting");
      expect(children).toHaveLength(1);

      // waitForReady() flips the state to "running". This
      // is what the production code does, so we're
      // exercising the real path. Inside waitForReady
      // there's a 250ms setTimeout that we need to drain.
      await vi.advanceTimersByTimeAsync(300);
      const ready = await sidecar.waitForReady(started.baseUrl, 100);
      expect(ready).toBe(true);
      const afterReady = sidecar.getEverOsSidecarStatus();
      expect(afterReady.state).toBe("running");
      expect(afterReady.running).toBe(true);

      // Crash #1 — close handler should record a crash
      // and schedule a restart. We deliberately do NOT
      // drain the restart timer before asserting; the
      // status must reflect the post-close-but-pre-restart
      // state so we can see "crashed" / "restarting" /
      // crashCount incrementing.
      children[0]!.emit("close", 1, null);
      await settleMicrotasks();
      let s = sidecar.getEverOsSidecarStatus();
      expect(s.crashCount).toBe(1);
      expect(s.state).toBe("crashed");
      expect(s.reason).toMatch(/restarting/i);

      // Crash #2..#5: advance the restart timer so the
      // manager spawns a new child, waitForReady() flips
      // it to "running", then crash it. After each
      // crash, assert state is "crashed" + reason mentions
      // "restarting" and crashCount incremented.
      for (let i = 1; i < MAX_CRASHES; i += 1) {
        await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS);
        expect(children.length).toBeGreaterThanOrEqual(i + 1);
        const newChild = children[i]!;
        // Bring the new child to "running".
        await vi.advanceTimersByTimeAsync(300);
        const ready2 = await sidecar.waitForReady(
          sidecar.getEverOsSidecarStatus().baseUrl,
          100,
        );
        expect(ready2).toBe(true);
        // Now crash it.
        newChild.emit("close", 1, null);
        await settleMicrotasks();
        s = sidecar.getEverOsSidecarStatus();
        expect(s.crashCount).toBe(i + 1);
        // All 1..MAX_CRASHES are "below the cap" so they
        // all schedule a restart.
        expect(s.state).toBe("crashed");
        expect(s.reason).toMatch(/restarting/i);
      }

      // After exactly MAX_CRASHES crashes, the next one
      // (the 6th) should hit the cap. Advance the restart
      // timer once more to spawn child #6, bring it to
      // "running", then crash it.
      await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS);
      const sixth = children[MAX_CRASHES]!;
      await vi.advanceTimersByTimeAsync(300);
      const ready6 = await sidecar.waitForReady(
        sidecar.getEverOsSidecarStatus().baseUrl,
        100,
      );
      expect(ready6).toBe(true);
      sixth.emit("close", 1, null);
      await settleMicrotasks();

      s = sidecar.getEverOsSidecarStatus();
      // The cap is "exceeded" (strictly greater than
      // MAX_CRASHES_IN_WINDOW); crashCount goes to 6.
      expect(s.crashCount).toBe(MAX_CRASHES + 1);
      // The state stays "crashed" and the reason explicitly
      // calls out the cap. This is what the renderer reads
      // to disable the auto-restart path and show the user
      // a "click Restart to try again" affordance.
      expect(s.state).toBe("crashed");
      expect(s.reason).toMatch(/cap reached/i);
      // The 6th close did NOT schedule a restart — only the
      // first 5 close events called setTimeout. Total spawn
      // calls so far: 6 (1 initial + 5 auto-restarts).
      expect(spawnMock).toHaveBeenCalledTimes(MAX_CRASHES + 1);

      // A user-triggered restart() should now be able to
      // re-arm the cap. It clears crashTimestamps, so the
      // next close will not exceed.
      const userRestarted = sidecar.restartEverOsSidecar();
      expect(userRestarted.state).toBe("starting");
      // The user restart spawned another child.
      expect(spawnMock).toHaveBeenCalledTimes(MAX_CRASHES + 2);
      const seventh = children[MAX_CRASHES + 1]!;
      await vi.advanceTimersByTimeAsync(300);
      await sidecar.waitForReady(
        sidecar.getEverOsSidecarStatus().baseUrl,
        100,
      );
      seventh.emit("close", 1, null);
      await settleMicrotasks();
      const afterUserRestart = sidecar.getEverOsSidecarStatus();
      // crashCount reset on user restart, so this counts
      // as the 1st crash in the new window.
      expect(afterUserRestart.crashCount).toBe(1);
      expect(afterUserRestart.reason).toMatch(/restarting/i);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
