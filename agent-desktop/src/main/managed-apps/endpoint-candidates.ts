/**
 * Host-gateway candidate resolution for managed-app endpoints.
 *
 * WHY THIS EXISTS
 *
 * The console kernel runs in a container. Its own `127.0.0.1` is the container's
 * loopback, NOT the host's, so any service the operator starts on their machine
 * is unreachable at the address they naturally type. Measured 2026-11-24 from
 * inside `cc-console-backend-1`:
 *
 *     http://localhost:1933/health          -> fetch failed
 *     http://host.docker.internal:1933/health -> 200
 *
 * The same defect appeared three times in three shapes:
 *
 *   1. `normalizeMcpEndpoint` rejected the alias outright for plain http;
 *   2. the DataFlow adapter had a single fixed endpoint and no fallback;
 *   3. `httpProbeApp` (openviking, weknora) bound ONE probe closure to the
 *      configured URL, so a live service reported `TypeError: fetch failed`.
 *
 * Fixing #3 by hand for each adapter would have left the next adapter to
 * rediscover it, so the candidate rule lives here and the callers use it.
 *
 * SAFETY
 *
 * The alias is appended only when the configured URL is itself loopback.
 * `host.docker.internal` is the operator's own machine reached by its container
 * name - Docker adds it via `extra_hosts` - so it does not widen the trust
 * boundary. An operator who named a REMOTE host has already said where the
 * service lives; adding a local fallback would probe a machine they never
 * mentioned.
 */

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

/** True when the URL's host is loopback, including the Docker gateway alias. */
export function isLoopbackEndpoint(raw: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(raw).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * URLs to try for `configured`, in order: the configured one first, then the
 * same origin via `host.docker.internal`.
 *
 * The configured URL always comes first so a failure reports the endpoint the
 * operator typed, not an alias they never mentioned.
 */
export function hostGatewayCandidates(configured: string): string[] {
  if (!isLoopbackEndpoint(configured)) return [configured];
  // Already the alias - nothing to fall back to.
  if (new URL(configured).hostname.toLowerCase() === "host.docker.internal") {
    return [configured];
  }

  let alias: string;
  try {
    const url = new URL(configured);
    url.hostname = "host.docker.internal";
    alias = url.toString().replace(/\/$/, "");
  } catch {
    return [configured];
  }

  return alias === configured ? [configured] : [configured, alias];
}

/**
 * Run `attempt` for each candidate until one answers.
 *
 * Returns the first SUCCESSFUL result together with the URL that produced it,
 * or - when every candidate fails - the first result with the configured URL.
 * Callers render `url`, so a card can never claim "reachable at localhost"
 * when it was reached through the alias.
 */
export async function firstAnswering<T>(
  configured: string,
  attempt: (url: string) => Promise<T>,
  isOk: (result: T) => boolean,
): Promise<{ result: T; url: string }> {
  const candidates = hostGatewayCandidates(configured);
  let first: { result: T; url: string } | null = null;
  for (const url of candidates) {
    const result = await attempt(url);
    first ??= { result, url };
    if (isOk(result)) return { result, url };
  }
  return first!;
}
