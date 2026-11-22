// The browser shell's transport shim, exercised as real JavaScript.
//
// THE BUG THIS PINS: the preload's 16 listener methods (`onChatChunk`,
// `onContextMenuCopyChat`, …) return an unsubscribe function `() => void`.
// Screens write `useEffect(() => window.hermesAPI.onXxx(cb), [])`, so the
// effect's cleanup IS whatever the call returned. In the Electron app that is
// a function. In the browser shell the method is unseeded, so the kernel's
// Proxy degraded every unknown property to
//
//   (...args) => Promise.resolve({ ...DEGRADED, method: prop })
//
// — a Promise. React stored it as the effect cleanup and called it on unmount,
// which throws `destroy_ is not a function` (React's internal name for the
// cleanup variable). That is the Settings-panel error seen in the container.
//
// These tests execute the generated shim in a sandbox with a stub EventSource
// and DOM, then assert the CONTRACT the call sites rely on, rather than
// pattern-matching the source text.

import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { ConsoleRouteRegistry } from "../console-backend/registry";
import { renderShimJs } from "../console-backend/shell";

/** Execute the generated shim and hand back the hermesAPI it installed. */
function loadShim() {
  const registry = new ConsoleRouteRegistry();
  // One seeded capability, so both the seeded and unseeded paths are exercised.
  registry.register({
    name: "kernelHome",
    ipcChannel: "kernel-home",
    handler: async () => ({ success: true }),
  });

  const code = renderShimJs(registry);
  const sandbox: Record<string, unknown> = {
    window: {},
    fetch: async () => ({ ok: true, json: async () => ({ success: true }) }),
    EventSource: class {
      onmessage: ((e: { data: string }) => void) | null = null;
      constructor(public url: string) {}
      close() {}
    },
    Object,
    JSON,
    Promise,
    Error,
    encodeURIComponent,
    console,
  };
  sandbox.globalThis = sandbox;
  runInNewContext(code, sandbox);
  return (sandbox.window as { hermesAPI: Record<string, unknown> }).hermesAPI;
}

describe("browser shell shim", () => {
  it("a seeded capability still returns its kernel payload", async () => {
    const api = loadShim();
    const result = await (api.kernelHome as () => Promise<unknown>)();
    expect(result).toEqual({ success: true });
  });

  it("an unseeded data call degrades to a result object, not a throw", async () => {
    const api = loadShim();
    const result = (await (api.notARealMethod as () => Promise<unknown>)()) as {
      degraded?: boolean;
      method?: string;
    };
    expect(result.degraded).toBe(true);
    expect(result.method).toBe("notARealMethod");
  });

  /**
   * The regression. Every unseeded `on*` listener must return a FUNCTION, so
   * `useEffect(() => api.onX(cb), [])` yields a valid cleanup. If this returns
   * a Promise, React throws "destroy_ is not a function" on unmount.
   */
  it("an unseeded listener returns a callable unsubscribe, never a Promise", () => {
    const api = loadShim();
    const unsubscribe = api.onContextMenuCopyChat as (cb: () => void) => unknown;

    expect(typeof unsubscribe).toBe("function");

    const cleanup = (unsubscribe as (cb: () => void) => unknown)(() => {});
    // The whole point: the effect cleanup must be callable.
    expect(typeof cleanup).toBe("function");
    expect(() => (cleanup as () => void)()).not.toThrow();
    // And it must not be a thenable — that is the shape that broke React.
    expect(
      typeof (cleanup as { then?: unknown }).then,
    ).not.toBe("function");
  });

  it("every on* listener shape is callable and yields callable cleanup", () => {
    const api = loadShim();
    // Representative sample spanning the families the preload exposes:
    // chat streaming, context menu, update flow, native menu.
    for (const name of [
      "onChatChunk",
      "onChatError",
      "onContextMenuSelectBubble",
      "onUpdateDownloaded",
      "onMenuNewChat",
    ]) {
      expect(typeof api[name], `${name} must be callable`).toBe("function");
      const cleanup = (api[name] as (cb: () => void) => unknown)(() => {});
      expect(typeof cleanup, `${name} cleanup must be a function`).toBe("function");
    }
  });

  it("does not mistake a lowercase 'on' prefix for a listener", () => {
    const api = loadShim();
    // `online`-style names would otherwise be treated as listeners and return
    // a no-op instead of the degraded result object.
    const result = api.online as () => Promise<unknown>;
    expect(typeof result).toBe("function");
    // It is the ordinary degraded data method: returns a Promise, not cleanup.
    return expect(result()).resolves.toMatchObject({ degraded: true });
  });
});
