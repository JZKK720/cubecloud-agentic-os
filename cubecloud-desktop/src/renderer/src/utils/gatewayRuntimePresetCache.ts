import {
  coerceGatewayRuntimePreset,
  type GatewayRuntimePresetId,
} from "../../../shared/gateway-runtime-presets";

const GATEWAY_RUNTIME_PRESET_CACHE_KEY = "hermes-gateway-runtime-preset";

export function getCachedGatewayRuntimePreset(
  fallback: GatewayRuntimePresetId = "hermes",
): GatewayRuntimePresetId {
  try {
    const cached = localStorage.getItem(GATEWAY_RUNTIME_PRESET_CACHE_KEY);
    return coerceGatewayRuntimePreset(cached) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setCachedGatewayRuntimePreset(
  preset: GatewayRuntimePresetId,
): void {
  try {
    localStorage.setItem(GATEWAY_RUNTIME_PRESET_CACHE_KEY, preset);
  } catch {
    /* ignore */
  }
}