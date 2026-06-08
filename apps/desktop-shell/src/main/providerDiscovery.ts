import { execFile } from "child_process";
import { promisify } from "util";
import {
  getProviderPreset,
  type AgentProviderDiscoveryResult,
  type AgentProviderPreset,
} from "../shared/providerCatalog";

const execFileAsync = promisify(execFile);

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function resolveBaseUrl(preset: AgentProviderPreset | undefined, baseUrl: string): string {
  return normalizeUrl(baseUrl || preset?.baseUrl || "");
}

function resolveApiKey(preset: AgentProviderPreset | undefined, apiKey: string): string {
  const explicitKey = apiKey.trim();
  if (explicitKey) {
    return explicitKey;
  }

  if (!preset?.apiKeyEnvVar) {
    return "";
  }

  return process.env[preset.apiKeyEnvVar]?.trim() ?? "";
}

async function commandExists(command: string): Promise<boolean> {
  const locator = process.platform === "win32" ? "where" : "which";

  try {
    await execFileAsync(locator, [command]);
    return true;
  } catch {
    return false;
  }
}

function buildHeaders(providerType: string, apiKey: string): Record<string, string> {
  if (!apiKey) {
    return {};
  }

  if (providerType === "anthropic") {
    return {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

function extractModelIds(payload: unknown): string[] {
  const names = new Set<string>();

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as {
    data?: Array<{ id?: unknown; model?: unknown; name?: unknown }>;
    models?: Array<{ id?: unknown; model?: unknown; name?: unknown }>;
  };

  for (const collection of [candidate.data, candidate.models]) {
    if (!Array.isArray(collection)) {
      continue;
    }

    for (const item of collection) {
      for (const value of [item?.id, item?.model, item?.name]) {
        if (typeof value === "string" && value.trim()) {
          names.add(value.trim());
          break;
        }
      }
    }
  }

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

async function discoverViaHttp(
  providerType: string,
  baseUrl: string,
  apiKey: string,
): Promise<AgentProviderDiscoveryResult> {
  if (!baseUrl) {
    return {
      providerType,
      status: "unsupported",
      models: [],
      detail: "This provider needs a base URL before the shell can discover models.",
      checkedAt: Date.now(),
    };
  }

  const endpoint = `${baseUrl}/models`;

  try {
    const response = await fetch(endpoint, {
      headers: buildHeaders(providerType, apiKey),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        providerType,
        status: "no-key",
        models: [],
        detail: `Authentication failed while querying ${endpoint}.`,
        checkedAt: Date.now(),
      };
    }

    if (!response.ok) {
      return {
        providerType,
        status: "unreachable",
        models: [],
        detail: `Model discovery returned HTTP ${response.status} from ${endpoint}.`,
        checkedAt: Date.now(),
      };
    }

    const payload = (await response.json()) as unknown;
    const models = extractModelIds(payload);

    return {
      providerType,
      status: "ok",
      models,
      detail:
        models.length > 0
          ? `Discovered ${models.length} model${models.length === 1 ? "" : "s"} from ${baseUrl}.`
          : `Connected to ${baseUrl}, but the endpoint returned no models.`,
      checkedAt: Date.now(),
    };
  } catch (error) {
    return {
      providerType,
      status: "unreachable",
      models: [],
      detail:
        error instanceof Error
          ? error.message
          : `Could not reach ${endpoint}.`,
      checkedAt: Date.now(),
    };
  }
}

async function discoverViaOllama(
  providerType: string,
  baseUrl: string,
): Promise<AgentProviderDiscoveryResult> {
  const normalizedBase = baseUrl.endsWith("/v1")
    ? baseUrl.slice(0, -3)
    : baseUrl;
  const endpoint = `${normalizedBase}/api/tags`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return {
        providerType,
        status: "unreachable",
        models: [],
        detail: `Ollama discovery returned HTTP ${response.status} from ${endpoint}.`,
        checkedAt: Date.now(),
      };
    }

    const payload = (await response.json()) as unknown;
    const models = extractModelIds(payload);

    return {
      providerType,
      status: "ok",
      models,
      detail:
        models.length > 0
          ? `Discovered ${models.length} Ollama model${models.length === 1 ? "" : "s"}.`
          : "Connected to Ollama, but no local models were listed.",
      checkedAt: Date.now(),
    };
  } catch (error) {
    return {
      providerType,
      status: "unreachable",
      models: [],
      detail:
        error instanceof Error
          ? error.message
          : `Could not reach ${endpoint}.`,
      checkedAt: Date.now(),
    };
  }
}

async function discoverViaCli(
  preset: AgentProviderPreset,
): Promise<AgentProviderDiscoveryResult> {
  if (!preset.cliCommand) {
    return {
      providerType: preset.type,
      status: "unsupported",
      models: [],
      detail: `${preset.name} does not declare a CLI command to probe.`,
      checkedAt: Date.now(),
    };
  }

  const available = await commandExists(preset.cliCommand);
  if (!available) {
    return {
      providerType: preset.type,
      status: "missing-cli",
      models: [],
      detail: `${preset.cliCommand} was not found on PATH for this machine.`,
      checkedAt: Date.now(),
    };
  }

  return {
    providerType: preset.type,
    status: "ok",
    models: [...(preset.defaultModels ?? [])],
    detail:
      preset.defaultModels && preset.defaultModels.length > 0
        ? `${preset.cliCommand} is available. Suggested CLI models were loaded from the preset catalog.`
        : `${preset.cliCommand} is available on PATH.`,
    checkedAt: Date.now(),
  };
}

export async function discoverControlPlaneProviderModels(
  providerType: string,
  baseUrl = "",
  apiKey = "",
): Promise<AgentProviderDiscoveryResult> {
  const preset = getProviderPreset(providerType);
  const resolvedBaseUrl = resolveBaseUrl(preset, baseUrl);
  const resolvedApiKey = resolveApiKey(preset, apiKey);
  const normalizedProviderType = providerType.trim() || preset?.type || "custom";

  if (preset?.requiresApiKey && !resolvedApiKey) {
    return {
      providerType: normalizedProviderType,
      status: "no-key",
      models: [],
      detail: preset.apiKeyEnvVar
        ? `Add an API key in the provider record or set ${preset.apiKeyEnvVar} in the environment before discovery.`
        : "Add an API key in the provider record before discovery.",
      checkedAt: Date.now(),
    };
  }

  const discoveryMode = preset?.discoveryMode ?? "openai-compatible";
  if (discoveryMode === "cli" && preset) {
    return discoverViaCli(preset);
  }

  if (discoveryMode === "ollama") {
    return discoverViaOllama(normalizedProviderType, resolvedBaseUrl);
  }

  return discoverViaHttp(normalizedProviderType, resolvedBaseUrl, resolvedApiKey);
}