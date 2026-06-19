import { execFile } from "child_process";
import { promisify } from "util";
import { testRemoteConnection } from "./hermes";
import {
  listDockerDiscoverableRuntimes,
  type RuntimeProviderId,
} from "../shared/runtime-orchestration";

const execFileAsync = promisify(execFile);
const WINDOWS_DOCKER_PATH =
  "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";

type DockerRuntimeKind = RuntimeProviderId;

export interface DockerRuntimeCandidate {
  id: string;
  kind: DockerRuntimeKind;
  name: string;
  containerName: string;
  image: string;
  host: string | null;
  port: number | null;
  endpointUrl: string | null;
  healthUrl: string | null;
  status: "ready" | "detected";
  detail: string;
  containerStatus: string;
  composeProject: string | null;
  composeService: string | null;
}

export interface DockerRuntimeDiscovery {
  status: "ready" | "empty" | "unavailable";
  message: string;
  scannedAt: string | null;
  runtimes: DockerRuntimeCandidate[];
}

interface DockerPsRow {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  Ports: string;
  Labels: string;
}

interface DockerPortBinding {
  host: string;
  hostPort: number;
  containerPort: number;
  protocol: string;
}

interface DockerRuntimeTarget {
  kind: DockerRuntimeKind;
  name: string;
  keywords: string[];
  preferredPorts: number[];
  healthPath: string;
}

const DOCKER_RUNTIME_TARGETS: readonly DockerRuntimeTarget[] =
  listDockerDiscoverableRuntimes().map((target) => ({
    kind: target.id,
    name: target.displayName,
    keywords: [...target.keywords],
    preferredPorts: [...target.preferredPorts],
    healthPath: target.id === "ironclaw" ? "/api/health" : "/health",
  }));

const INFRASTRUCTURE_KEYWORDS = [
  "cloudflared",
  "postgres",
  "pgvector",
  "redis",
  "worker",
  "cache",
  "queue",
  "broker",
  "scheduler",
  "migration",
];

function isMissingBinaryError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

async function runDockerCommand(args: string[]): Promise<string> {
  const candidates =
    process.platform === "win32"
      ? ["docker", WINDOWS_DOCKER_PATH]
      : ["docker"];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const result = await execFileAsync(candidate, args, {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });

      return String(result.stdout);
    } catch (error) {
      lastError = error;
      if (!isMissingBinaryError(error)) {
        break;
      }
    }
  }

  throw lastError;
}

function parseDockerPsRows(stdout: string): DockerPsRow[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as DockerPsRow];
      } catch {
        return [];
      }
    });
}

function parseDockerLabel(labels: string, labelKey: string): string | null {
  const candidate = labels
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${labelKey}=`));

  if (!candidate) {
    return null;
  }

  const [, ...valueParts] = candidate.split("=");
  const value = valueParts.join("=").trim();
  return value.length > 0 ? value : null;
}

function normalizeDockerHost(host: string): string {
  if (host === "0.0.0.0" || host === "[::]" || host === "::") {
    return "127.0.0.1";
  }

  return host;
}

function parseDockerPorts(ports: string): DockerPortBinding[] {
  if (!ports.trim()) {
    return [];
  }

  const seen = new Set<string>();

  return ports
    .split(",")
    .map((segment) => segment.trim())
    .flatMap((segment) => {
      const match = /^(.+):(\d+)->(\d+)\/(\w+)$/.exec(segment);

      if (!match) {
        return [];
      }

      const [, host, hostPort, containerPort, protocol] = match;
      const binding = {
        host: normalizeDockerHost(host.trim()),
        hostPort: Number(hostPort),
        containerPort: Number(containerPort),
        protocol,
      } satisfies DockerPortBinding;
      const key = `${binding.host}:${binding.hostPort}:${binding.containerPort}/${binding.protocol}`;

      if (seen.has(key)) {
        return [];
      }

      seen.add(key);
      return [binding];
    });
}

function rankPortBindings(
  ports: DockerPortBinding[],
  preferredPorts: readonly number[],
): DockerPortBinding[] {
  return ports
    .map((binding, index) => ({
      binding,
      index,
      preferredIndex:
        binding.protocol === "tcp"
          ? preferredPorts.findIndex(
              (preferredPort) =>
                binding.containerPort === preferredPort ||
                binding.hostPort === preferredPort,
            )
          : -1,
    }))
    .sort((left, right) => {
      const leftPreferredRank =
        left.preferredIndex === -1
          ? Number.MAX_SAFE_INTEGER
          : left.preferredIndex;
      const rightPreferredRank =
        right.preferredIndex === -1
          ? Number.MAX_SAFE_INTEGER
          : right.preferredIndex;

      if (leftPreferredRank !== rightPreferredRank) {
        return leftPreferredRank - rightPreferredRank;
      }

      const leftProtocolRank = left.binding.protocol === "tcp" ? 0 : 1;
      const rightProtocolRank = right.binding.protocol === "tcp" ? 0 : 1;

      if (leftProtocolRank !== rightProtocolRank) {
        return leftProtocolRank - rightProtocolRank;
      }

      return left.index - right.index;
    })
    .map(({ binding }) => binding);
}

function resolveRuntimeTarget(row: DockerPsRow): DockerRuntimeTarget | null {
  const composeService = parseDockerLabel(row.Labels, "com.docker.compose.service") ?? "";
  const haystack = [row.Names, row.Image, composeService].join(" ").toLowerCase();

  if (INFRASTRUCTURE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return null;
  }

  return (
    DOCKER_RUNTIME_TARGETS.find((target) =>
      target.keywords.some((keyword) => haystack.includes(keyword)),
    ) ?? null
  );
}

async function buildDockerRuntimeCandidate(
  row: DockerPsRow,
  target: DockerRuntimeTarget,
): Promise<DockerRuntimeCandidate> {
  const composeProject = parseDockerLabel(row.Labels, "com.docker.compose.project");
  const composeService = parseDockerLabel(row.Labels, "com.docker.compose.service");
  const portBindings = rankPortBindings(
    parseDockerPorts(row.Ports ?? ""),
    target.preferredPorts,
  );

  if (portBindings.length === 0) {
    return {
      id: `${target.kind}:${row.ID}`,
      kind: target.kind,
      name: target.name,
      containerName: row.Names,
      image: row.Image,
      host: null,
      port: null,
      endpointUrl: null,
      healthUrl: null,
      status: "detected",
      detail:
        "Container is running, but Docker is not publishing a local TCP port for this runtime yet.",
      containerStatus: row.Status,
      composeProject,
      composeService,
    };
  }

  const probeResults = await Promise.all(
    portBindings.map(async (portBinding) => {
      const endpointUrl = `http://${portBinding.host}:${portBinding.hostPort}`;
      const healthUrl = `${endpointUrl}${target.healthPath}`;

      return {
        portBinding,
        endpointUrl,
        healthUrl,
        isReady: await testRemoteConnection(endpointUrl),
      };
    }),
  );
  const selectedProbe =
    probeResults.find((probeResult) => probeResult.isReady) ?? probeResults[0];
  const { portBinding, endpointUrl, healthUrl, isReady } = selectedProbe;

  return {
    id: `${target.kind}:${row.ID}`,
    kind: target.kind,
    name: target.name,
    containerName: row.Names,
    image: row.Image,
    host: portBinding.host,
    port: portBinding.hostPort,
    endpointUrl,
    healthUrl,
    status: isReady ? "ready" : "detected",
    detail: isReady
      ? `Health check succeeded at ${healthUrl}.`
      : `Published ${endpointUrl}, but ${target.healthPath} did not return 200 yet. You can still review the endpoint manually.`,
    containerStatus: row.Status,
    composeProject,
    composeService,
  };
}

export async function discoverDockerRuntimes(): Promise<DockerRuntimeDiscovery> {
  const targetNames = DOCKER_RUNTIME_TARGETS.map((target) => target.name);
  const targetLabel = targetNames.join(", ");

  try {
    const stdout = await runDockerCommand(["ps", "--format", "{{json .}}"]);
    const rows = parseDockerPsRows(stdout);
    const targets = rows
      .map((row) => {
        const target = resolveRuntimeTarget(row);

        if (!target) {
          return null;
        }

        return { row, target };
      })
      .filter(
        (candidate): candidate is { row: DockerPsRow; target: DockerRuntimeTarget } =>
          candidate != null,
      );

    if (targets.length === 0) {
      return {
        status: "empty",
        message:
          `No paired runtime container was detected in Docker Desktop. Start any of ${targetLabel} in a container and rescan to hand off through the container gateway.`,
        scannedAt: new Date().toISOString(),
        runtimes: [],
      };
    }

    const runtimes = await Promise.all(
      targets.map(({ row, target }) => buildDockerRuntimeCandidate(row, target)),
    );
    runtimes.sort((left, right) => {
      const leftReady = left.status === "ready" ? 0 : 1;
      const rightReady = right.status === "ready" ? 0 : 1;

      if (leftReady !== rightReady) {
        return leftReady - rightReady;
      }

      return left.name.localeCompare(right.name);
    });

    const readyCount = runtimes.filter((runtime) => runtime.status === "ready").length;

    return {
      status: readyCount > 0 ? "ready" : "empty",
      message:
        readyCount > 0
          ? `Detected ${readyCount} paired runtime gateway${readyCount === 1 ? "" : "s"} ready for handoff (${runtimes
              .filter((runtime) => runtime.status === "ready")
              .map((runtime) => runtime.name)
              .join(", ")}).`
          : `Detected paired runtime container candidates, but none of their published endpoints passed the health check yet.`,
      scannedAt: new Date().toISOString(),
      runtimes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Docker scan failed.";

    return {
      status: "unavailable",
      message: `Docker Desktop scan unavailable: ${message}`,
      scannedAt: new Date().toISOString(),
      runtimes: [],
    };
  }
}