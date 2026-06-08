import { describe, expect, it } from "vitest";
import { t } from "./index";

describe("shared i18n", () => {
  it("returns English text by default", () => {
    expect(t("welcome.flowTitle")).toBe("Set up your gateway");
  });

  it("falls back to the key when an English key is missing", () => {
    expect(t("common.missingKey")).toBe("common.missingKey");
  });

  it("returns zh-CN text when available", () => {
    expect(t("welcome.flowTitle", "zh-CN")).toBe("设置你的网关");
  });

  it("returns zh-TW text when available", () => {
    expect(t("welcome.flowTitle", "zh-TW")).toBe("設定你的閘道");
  });

  it("returns es text when available", () => {
    expect(t("welcome.flowTitle", "es")).toBe("Configura tu gateway");
  });

  it("returns id text when available", () => {
    expect(t("welcome.flowTitle", "id")).toBe("Siapkan gateway Anda");
  });

  it("falls back to en when zh-CN key is missing", () => {
    expect(t("nonExistent.fallbackKey", "zh-CN")).toBe(
      "nonExistent.fallbackKey",
    );
  });

  it("preserves interpolation placeholders in es", () => {
    expect(t("common.updateAvailable", "es", { version: "1.2.3" })).toBe(
      "Actualizar a v1.2.3",
    );
  });

  it("returns the new Headroom quick-start keys in English", () => {
    expect(t("headroom.quickStart.title")).toBe("Quick start");
    expect(t("headroom.quickStart.installCommand")).toBe(
      'pip install "headroom-ai[all]"',
    );
  });

  it("falls back to English for keys that do not exist in any locale", () => {
    // The repo-localized Headroom set is en + zh-CN. For
    // every other locale the headroom.ts file re-exports
    // the English copy, so a key that is genuinely missing
    // in the en source of truth must surface as the
    // missing-key fallback.
    expect(t("headroom.quickStart.placeholderNonExistent", "ja")).toBe(
      "headroom.quickStart.placeholderNonExistent",
    );
  });

  it("returns the zh-CN native Headroom quick-start title", () => {
    // The only non-en locale with real native Headroom
    // copy is zh-CN, consistent with the rest of the
    // desktop and the outer README translation wave.
    expect(t("headroom.quickStart.title", "zh-CN")).toBe("快速开始");
  });

  it("falls back to English for non-zh-CN Headroom locales", () => {
    // The remaining 6 locales (zh-TW, ja, es, id, pt-BR,
    // pt-PT) intentionally re-export the en copy. Verify
    // the fallback path stays intact for them.
    expect(t("headroom.quickStart.title", "ja")).toBe("Quick start");
    expect(t("headroom.quickStart.title", "pt-BR")).toBe("Quick start");
    expect(t("headroom.quickStart.title", "id")).toBe("Quick start");
  });

  it("exposes the dismiss / reset / optimize CTA keys in en", () => {
    expect(t("headroom.quickStart.dismiss")).toBe("Hide this card");
    expect(t("headroom.quickStart.reset")).toBe("Reset quick start");
    expect(t("headroom.quickStart.switchMode")).toBe("Switch to optimize");
    expect(t("headroom.quickStart.collapsedSummary", "ja")).toBe(
      "Quick start hidden. Open it any time to re-run the audit → test → optimize walkthrough.",
    );
  });
});
