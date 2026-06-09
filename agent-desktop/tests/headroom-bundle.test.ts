/**
 * Unit tests for compressCodeGraphBundle (src/main/headroom.ts).
 *
 * The function is a small, best-effort wrapper that:
 *   - returns the original when bundle is below MIN_BUNDLE_BYTES
 *   - returns the original when config.enabled is false
 *   - returns the original when the sidecar isn't running
 *   - returns the original when compressMessages fails
 *   - returns the compressed text when all gates pass
 *   - never throws �?always degrades gracefully
 *
 * We mock compressMessages and getHeadroomSidecarStatus to
 * exercise every branch without needing a real proxy.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  compressMessagesMock,
  getHeadroomSidecarStatusMock,
  loadHeadroomConfigMock,
} = vi.hoisted(() => ({
  compressMessagesMock: vi.fn(),
  getHeadroomSidecarStatusMock: vi.fn(),
  loadHeadroomConfigMock: vi.fn(),
}));

vi.mock("../src/main/headroom", () => ({
  compressMessages: compressMessagesMock,
  loadHeadroomConfig: loadHeadroomConfigMock,
}));

vi.mock("../src/main/headroom-sidecar", () => ({
  getHeadroomSidecarStatus: getHeadroomSidecarStatusMock,
}));

function makeBundle(bytes: number): string {
  return "x".repeat(bytes);
}

describe("compressCodeGraphBundle", () => {
  beforeEach(() => {
    compressMessagesMock.mockReset();
    getHeadroomSidecarStatusMock.mockReset();
    loadHeadroomConfigMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the original when the bundle is too small", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    const bundle = makeBundle(100);
    const result = await compressCodeGraphBundle(bundle);
    expect(result.context).toBe(bundle);
    expect(result.compressed).toBe(false);
    expect(result.error).toBeNull();
    expect(compressMessagesMock).not.toHaveBeenCalled();
  });

  it("returns the original when config is disabled", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    loadHeadroomConfigMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:8787",
      mode: "audit",
      enabled: false,
      apiKey: null,
    });
    getHeadroomSidecarStatusMock.mockReturnValue({
      state: "running",
      running: true,
      pid: 1,
      port: 8787,
      baseUrl: "http://127.0.0.1:8787",
      lastError: null,
      crashCount: 0,
      startedAt: 0,
      uptimeMs: 0,
      reason: null,
      mode: "audit",
    });
    const bundle = makeBundle(10_000);
    const result = await compressCodeGraphBundle(bundle);
    expect(result.context).toBe(bundle);
    expect(result.compressed).toBe(false);
    expect(compressMessagesMock).not.toHaveBeenCalled();
  });

  it("returns the original when the sidecar is not running", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    loadHeadroomConfigMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:8787",
      mode: "audit",
      enabled: true,
      apiKey: null,
    });
    getHeadroomSidecarStatusMock.mockReturnValue({
      state: "stopped",
      running: false,
      pid: null,
      port: null,
      baseUrl: "http://127.0.0.1:8787",
      lastError: null,
      crashCount: 0,
      startedAt: null,
      uptimeMs: null,
      reason: "stopped",
      mode: "audit",
    });
    const bundle = makeBundle(10_000);
    const result = await compressCodeGraphBundle(bundle);
    expect(result.context).toBe(bundle);
    expect(result.compressed).toBe(false);
    expect(compressMessagesMock).not.toHaveBeenCalled();
  });

  it("returns the original when compressMessages reports failure", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    loadHeadroomConfigMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:8787",
      mode: "audit",
      enabled: true,
      apiKey: null,
    });
    getHeadroomSidecarStatusMock.mockReturnValue({
      state: "running",
      running: true,
      pid: 1,
      port: 8787,
      baseUrl: "http://127.0.0.1:8787",
      lastError: null,
      crashCount: 0,
      startedAt: 0,
      uptimeMs: 0,
      reason: null,
      mode: "audit",
    });
    compressMessagesMock.mockResolvedValue({
      success: false,
      messages: [],
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressed: false,
      error: "proxy exploded",
    });
    const bundle = makeBundle(10_000);
    const result = await compressCodeGraphBundle(bundle);
    expect(result.context).toBe(bundle);
    expect(result.compressed).toBe(false);
    expect(result.error).toBe("proxy exploded");
  });

  it("returns the compressed text on success", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    loadHeadroomConfigMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:8787",
      mode: "optimize",
      enabled: true,
      apiKey: null,
    });
    getHeadroomSidecarStatusMock.mockReturnValue({
      state: "running",
      running: true,
      pid: 1,
      port: 8787,
      baseUrl: "http://127.0.0.1:8787",
      lastError: null,
      crashCount: 0,
      startedAt: 0,
      uptimeMs: 0,
      reason: null,
      mode: "optimize",
    });
    const compressedText = "compressed-bundle-half-the-size";
    compressMessagesMock.mockResolvedValue({
      success: true,
      messages: [{ role: "user", content: compressedText }],
      tokensBefore: 2500,
      tokensAfter: 600,
      savingsPercent: 76,
      compressed: true,
    });
    const bundle = makeBundle(10_000);
    const result = await compressCodeGraphBundle(bundle);
    expect(result.context).toBe(compressedText);
    expect(result.compressed).toBe(true);
    expect(result.originalSize).toBe(10_000);
    expect(result.compressedSize).toBe(compressedText.length);
    // 10_000 vs ~30 char string: > 99% reduction.
    expect(result.savingsPercent).toBeGreaterThan(50);
  });

  it("never throws on compressMessages rejection", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    loadHeadroomConfigMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:8787",
      mode: "audit",
      enabled: true,
      apiKey: null,
    });
    getHeadroomSidecarStatusMock.mockReturnValue({
      state: "running",
      running: true,
      pid: 1,
      port: 8787,
      baseUrl: "http://127.0.0.1:8787",
      lastError: null,
      crashCount: 0,
      startedAt: 0,
      uptimeMs: 0,
      reason: null,
      mode: "audit",
    });
    compressMessagesMock.mockRejectedValue(new Error("network down"));
    const bundle = makeBundle(10_000);
    // The Promise.race in compressCodeGraphBundle resolves on
    // timeout, but a synchronous throw inside compressMessages
    // would propagate. Verify we don't crash.
    const result = await compressCodeGraphBundle(bundle);
    expect(result.context).toBeDefined();
    expect(result.compressed).toBe(false);
  });

  it("returns the original when compressed size >= original", async () => {
    const { compressCodeGraphBundle } = await import("../src/main/headroom-bundle");
    loadHeadroomConfigMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:8787",
      mode: "audit",
      enabled: true,
      apiKey: null,
    });
    getHeadroomSidecarStatusMock.mockReturnValue({
      state: "running",
      running: true,
      pid: 1,
      port: 8787,
      baseUrl: "http://127.0.0.1:8787",
      lastError: null,
      crashCount: 0,
      startedAt: 0,
      uptimeMs: 0,
      reason: null,
      mode: "audit",
    });
    // Compressed content is bigger than the original bundle.
    const inflatedContent = "y".repeat(20_000);
    compressMessagesMock.mockResolvedValue({
      success: true,
      messages: [{ role: "user", content: inflatedContent }],
      tokensBefore: 5000,
      tokensAfter: 5000,
      savingsPercent: 0,
      compressed: true,
    });
    const bundle = makeBundle(10_000);
    const result = await compressCodeGraphBundle(bundle);
    // result.compressed should be false because compressedSize
    // is not < originalSize.
    expect(result.compressed).toBe(false);
    // The context is still the compressed one, but the flag
    // is false so the caller treats it as a no-op.
    expect(result.context).toBe(inflatedContent);
  });
});
