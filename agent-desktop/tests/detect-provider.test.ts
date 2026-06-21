import { describe, expect, it } from "vitest";
import { detectProviderFromUrl } from "../src/renderer/src/screens/Models/detect-provider";

describe("detectProviderFromUrl", () => {
  it("returns null for empty input", () => {
    expect(detectProviderFromUrl("")).toBeNull();
    expect(detectProviderFromUrl("   ")).toBeNull();
  });

  it("identifies hosted providers by hostname", () => {
    expect(detectProviderFromUrl("https://openrouter.ai/api/v1")).toBe(
      "openrouter",
    );
    expect(detectProviderFromUrl("https://api.anthropic.com")).toBe(
      "anthropic",
    );
    expect(detectProviderFromUrl("https://api.openai.com/v1")).toBe("openai");
    expect(
      detectProviderFromUrl("https://generativelanguage.googleapis.com/v1beta"),
    ).toBe("google");
    expect(detectProviderFromUrl("https://api.x.ai/v1")).toBe("xai");
    expect(
      detectProviderFromUrl("https://inference-api.nousresearch.com/v1"),
    ).toBe("nous");
    expect(
      detectProviderFromUrl(
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      ),
    ).toBe("qwen");
    expect(detectProviderFromUrl("https://api.minimax.chat/v1")).toBe(
      "minimax",
    );
  });

  it("identifies private-network and loopback addresses as custom", () => {
    expect(detectProviderFromUrl("http://localhost:11434")).toBe("ollama");
    expect(detectProviderFromUrl("http://127.0.0.1:11434/v1")).toBe("ollama");
    expect(detectProviderFromUrl("http://192.168.1.50:11434")).toBe("ollama");
    expect(detectProviderFromUrl("http://10.0.0.5:8000")).toBe("custom");
    expect(detectProviderFromUrl("http://172.20.0.3:1234")).toBe("lmstudio");
    expect(detectProviderFromUrl("http://hermes.local:11434")).toBe("ollama");
  });

  it("identifies well-known local-LLM ports on any host with named provider", () => {
    // Ollama on a LAN VM with a public-looking hostname — named
    // "ollama" so the model card labels the entry correctly rather
    // than the generic "OpenAI Compatible / Local".
    expect(
      detectProviderFromUrl("http://ollama.andrea-house.com:11434/v1"),
    ).toBe("ollama");
    // LM Studio on a remote workstation
    expect(
      detectProviderFromUrl("http://my-workstation.example.com:1234/v1"),
    ).toBe("lmstudio");
    // Atomic Chat — less common, still surfaces as custom
    expect(
      detectProviderFromUrl("http://atomic-box.example.com:1337/v1"),
    ).toBe("custom");
    // vLLM — generic OpenAI-compat, falls through to "custom"
    expect(detectProviderFromUrl("http://gpu-rig.example.com:8000")).toBe(
      "custom",
    );
    // llama.cpp server
    expect(detectProviderFromUrl("http://llama.example.com:8080")).toBe(
      "custom",
    );
  });

  it("prefers named local-LLM provider over generic private-network match", () => {
    // localhost:11434 — both rules apply (private-network + Ollama
    // port); the named rule wins so the dropdown shows "Ollama
    // (local)" not "OpenAI Compatible / Local".
    expect(detectProviderFromUrl("http://localhost:11434/v1")).toBe("ollama");
    expect(detectProviderFromUrl("http://localhost:1234/v1")).toBe(
      "lmstudio",
    );
  });

  it("excludes 172.x outside the RFC1918 range", () => {
    // Port 11434 is Ollama's default — the named-port heuristic
    // correctly returns "ollama" even on a 172.x address.
    expect(detectProviderFromUrl("http://172.15.0.1:11434")).toBe("ollama");
    expect(detectProviderFromUrl("http://172.32.0.1:9999")).toBeNull();
  });

  it("returns null for unknown public URLs without a local-LLM port", () => {
    expect(detectProviderFromUrl("https://example.com/v1")).toBeNull();
    expect(detectProviderFromUrl("https://api.example.com:443")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(detectProviderFromUrl("HTTPS://API.OPENAI.COM")).toBe("openai");
    expect(detectProviderFromUrl("HTTP://LOCALHOST:11434")).toBe("ollama");
  });

  it("tolerates bare host:port without a scheme", () => {
    // Port 1234 is LM Studio's default — recognized even without a scheme.
    expect(detectProviderFromUrl("localhost:1234")).toBe("lmstudio");
    expect(detectProviderFromUrl("192.168.1.10:8080")).toBe("custom");
  });
});
