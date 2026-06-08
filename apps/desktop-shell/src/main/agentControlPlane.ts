import { randomUUID } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { app } from "electron";
import type {
  AgentChatSession,
  AgentDispatchContextOverride,
  AgentDispatchCodeGraphContext,
  AgentDispatchRun,
  AgentDispatchRunContext,
  AgentDispatchRunSource,
  CodeGraphEntrypoint,
  CodeGraphQueryTemplate,
  CodeGraphRepoSummary,
  EverOsHarness,
  AgentMemoryEntry,
  AgentModelEndpoint,
  AgentProfile,
  AgentProviderConfig,
  AgentSchedule,
  AgentSessionHistoryItem,
  AgentSkill,
  AgentTool,
  KanbanBoard,
  KanbanTask,
  PlatformRuntimeProviderId,
} from "@cubecloud/platform-core";
import type {
  WorkspaceCodeGraphEntrypointInput,
  WorkspaceCodeGraphQueryInput,
  WorkspaceCodeGraphRepoInput,
  WorkspaceEverOsHarnessInput,
  WorkspaceKanbanBoardInput,
  WorkspaceKanbanTaskInput,
  WorkspaceMemoryInput,
  WorkspaceModelInput,
  WorkspaceProfileInput,
  WorkspaceProviderInput,
  WorkspaceScheduleInput,
  WorkspaceSkillInput,
  WorkspaceToolInput,
} from "./agentWorkspace";
import {
  seedDefaultSkills,
  DEFAULT_SKILLS_SEED_VERSION,
} from "./defaultSkills";
import {
  seedDefaultMemories,
  DEFAULT_MEMORIES_SEED_VERSION,
} from "./defaultMemories";
import {
  seedDefaultHarnesses,
  DEFAULT_HARNESSES_SEED_VERSION,
} from "./defaultHarnesses";
import {
  seedDefaultSchedules,
  DEFAULT_SCHEDULES_SEED_VERSION,
} from "./defaultSchedules";
import {
  seedDefaultKanban,
  DEFAULT_KANBAN_SEED_VERSION,
} from "./defaultKanban";

/**
 * V2.9 pre-launch bundle seed versions. The settings store
 * includes the per-surface seed version on first run so the
 * V2.9 audit can confirm the seed ran. Bumping the seed
 * version in a future release will trigger a re-seed of new
 * items (the seed is idempotent against existing ids).
 */
export const PRELAUNCH_SEED_VERSIONS = {
  skills: DEFAULT_SKILLS_SEED_VERSION,
  memories: DEFAULT_MEMORIES_SEED_VERSION,
  harnesses: DEFAULT_HARNESSES_SEED_VERSION,
  schedules: DEFAULT_SCHEDULES_SEED_VERSION,
  kanban: DEFAULT_KANBAN_SEED_VERSION,
} as const;

export interface WorkspaceSessionSnapshotInput {
  sessionId?: string;
  title?: string;
  model: string;
  history: AgentSessionHistoryItem[];
  source?: string;
}

interface StoredSkill extends Omit<AgentSkill, "path"> {
  slug: string;
}

interface StoredWorkspaceProfile {
  name: string;
  model: string;
  provider: string;
  isDefault: boolean;
  kanbanBoardSlug?: string | null;
}

interface StoredCodeGraphRepo {
  id: string;
  name: string;
  repoPath: string;
  description: string;
  selected: boolean;
}

interface StoredCodeGraphState {
  repos: StoredCodeGraphRepo[];
  entrypoints: CodeGraphEntrypoint[];
  queries: CodeGraphQueryTemplate[];
}

interface StoredEverOsState {
  harnesses: EverOsHarness[];
}

interface CodeGraphApi {
  isInitialized?(repoPath: string): boolean;
  openSync?(repoPath: string): {
    getStats?: () => Record<string, unknown> | null | undefined;
    getDetectedFrameworks?: () => string[] | null | undefined;
    close?: () => void;
  };
  init?(
    repoPath: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  open?(repoPath: string): Promise<{
    sync?: () => Promise<unknown>;
    indexAll?: () => Promise<unknown>;
    close?: () => Promise<void> | void;
  }>;
}

interface StoredWorkspaceSession {
  id: string;
  title: string | null;
  startedAt: number;
  updatedAt: number;
  messageCount: number;
  model: string;
  source: string;
  history: AgentSessionHistoryItem[];
}

interface StoredKanbanBoard {
  slug: string;
  name: string;
  description: string | null;
  isCurrent: boolean;
}

interface StoredKanbanState {
  boards: StoredKanbanBoard[];
  tasks: Record<string, KanbanTask[]>;
}

export interface ControlPlaneDispatchRuntimeRequest {
  runtimeProviderId: PlatformRuntimeProviderId;
  model: string;
  source: AgentDispatchRunSource;
  targetType: "profile" | "schedule";
  targetId: string | null;
  targetName: string;
  prompt: string;
  context: AgentDispatchRunContext;
}

export interface ControlPlaneDispatchRuntimeResult {
  output: string;
}

export type ControlPlaneDispatchRuntimeExecutor = (
  request: ControlPlaneDispatchRuntimeRequest,
) => Promise<ControlPlaneDispatchRuntimeResult>;

let controlPlaneDispatchRuntimeExecutor: ControlPlaneDispatchRuntimeExecutor | null = null;

const VALID_KANBAN_STATUSES = new Set([
  "queued",
  "active",
  "done",
  "failed",
]);

const codegraphRequire = createRequire(import.meta.url);

export const DEFAULT_AGENT_SOUL = `You are the active Cubecloud agent for this desktop lane.

Operate like a precise operator: stay concise, surface risks early, prefer grounded actions over speculation, and keep models, tools, memory, and schedules aligned with the user's intent.

When a request is actionable, execute it directly. When a request is ambiguous, ask only for the smallest missing detail that blocks correct execution. Be honest about runtime limits and verification status.
`;

const DEFAULT_TOOLS: AgentTool[] = [
  {
    name: "web",
    description: "Fetch and inspect HTTP resources for agent workflows.",
    endpoint: "workspace://toolsets/web",
    type: "builtin",
    enabled: true,
  },
  {
    name: "browser",
    description: "Drive browser actions for verification and research.",
    endpoint: "workspace://toolsets/browser",
    type: "builtin",
    enabled: true,
  },
  {
    name: "terminal",
    description: "Run local terminal commands from the active lane.",
    endpoint: "workspace://toolsets/terminal",
    type: "builtin",
    enabled: true,
  },
  {
    name: "file",
    description: "Read and edit files inside the working tree.",
    endpoint: "workspace://toolsets/file",
    type: "builtin",
    enabled: true,
  },
  {
    name: "skills",
    description: "Enable prompt skills and workspace skill packs.",
    endpoint: "workspace://toolsets/skills",
    type: "builtin",
    enabled: true,
  },
  {
    name: "memory",
    description: "Store and reuse durable notes across sessions.",
    endpoint: "workspace://toolsets/memory",
    type: "builtin",
    enabled: true,
  },
  {
    name: "session_search",
    description: "Search recent sessions and operator activity.",
    endpoint: "workspace://toolsets/session-search",
    type: "builtin",
    enabled: true,
  },
  {
    name: "cronjob",
    description: "Run recurring automation through local schedules.",
    endpoint: "workspace://toolsets/cronjob",
    type: "builtin",
    enabled: true,
  },
  {
    name: "todo",
    description: "Track operator plans and active work items.",
    endpoint: "workspace://toolsets/todo",
    type: "builtin",
    enabled: true,
  },
];

function controlPlaneRoot(): string {
  return join(app.getPath("userData"), "agent-workspace", "providers");
}

function resolveRuntimeProviderId(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): PlatformRuntimeProviderId {
  return runtimeProviderId ?? "hermes";
}

function providerDir(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(controlPlaneRoot(), resolveRuntimeProviderId(runtimeProviderId));
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function registerControlPlaneDispatchRuntimeExecutor(
  executor: ControlPlaneDispatchRuntimeExecutor | null,
): void {
  controlPlaneDispatchRuntimeExecutor = executor;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

/**
 * Idempotent pre-launch seed. After reading the saved data
 * with `readJsonFile`, apply the V2.9 pre-launch bundle seed
 * and write the merged result back to disk. The seed is
 * idempotent against existing ids; the user's deletions stick.
 *
 * Returns the merged data so callers don't need a second read.
 */
function readJsonFileWithSeed<T>(
  filePath: string,
  fallback: T,
  seed: (data: T) => T,
  writeBack: boolean,
): T {
  const saved = readJsonFile<T>(filePath, fallback);
  const merged = seed(saved);
  if (writeBack && merged !== saved) {
    writeJsonFile(filePath, merged);
  }
  return merged;
}

function writeJsonFile(filePath: string, value: unknown): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function createWorkspaceId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function sanitizeText(value: string): string {
  return value.trim();
}

function sanitizeSkillSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

function sanitizeKanbanBoardSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "board"
  );
}

function normalizeSessionTitle(value: string | null | undefined): string | null {
  const normalized = sanitizeText(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

function nextRunAtFromCron(cron: string, enabled: boolean): number | null {
  if (!enabled) {
    return null;
  }

  const minutesMatch = cron.match(/^(\d+)m$/i);
  if (minutesMatch) {
    return Date.now() + Number(minutesMatch[1]) * 60 * 1000;
  }

  const hoursMatch = cron.match(/^(\d+)h$/i);
  if (hoursMatch) {
    return Date.now() + Number(hoursMatch[1]) * 60 * 60 * 1000;
  }

  return null;
}

function countTranscriptMessages(history: AgentSessionHistoryItem[]): number {
  return history.filter(
    (item) => item.kind === "user" || item.kind === "assistant",
  ).length;
}

function deriveSessionTitle(
  history: AgentSessionHistoryItem[],
  sessionId: string,
  explicitTitle?: string | null,
): string {
  const normalizedTitle = normalizeSessionTitle(explicitTitle);
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const firstUserTurn = history.find((item) => item.kind === "user");
  if (firstUserTurn?.content) {
    return firstUserTurn.content.trim().slice(0, 72) || `Session ${sessionId.slice(-6)}`;
  }

  return `Session ${sessionId.slice(-6)}`;
}

function defaultKanbanState(): StoredKanbanState {
  return {
    boards: [
      {
        slug: "operations",
        name: "Operations",
        description: "Unified Cubecloud control board for this runtime lane.",
        isCurrent: true,
      },
    ],
    tasks: {
      operations: [],
    },
  };
}

function normalizeKanbanState(state: StoredKanbanState): StoredKanbanState {
  const fallback = defaultKanbanState();
  const boards = state.boards.length > 0 ? state.boards : fallback.boards;
  const currentIndex = boards.findIndex((board) => board.isCurrent);
  const resolvedCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const normalizedBoards = boards.map((board, index) => ({
    ...board,
    description: board.description ?? null,
    isCurrent: index === resolvedCurrentIndex,
  }));

  return {
    boards: normalizedBoards,
    tasks: normalizedBoards.reduce<Record<string, KanbanTask[]>>((acc, board) => {
      acc[board.slug] = state.tasks[board.slug] ?? [];
      return acc;
    }, {}),
  };
}

function readKanbanState(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredKanbanState {
  // V2.9 pre-launch seed: 1 starter board with 5 deletable example tasks.
  // Idempotent against the user's saved boards; respects deletions.
  return normalizeKanbanState(
    readJsonFileWithSeed<StoredKanbanState>(
      kanbanFilePath(runtimeProviderId),
      defaultKanbanState(),
      (state) => {
        const seeded = seedDefaultKanban(state.boards, Object.values(state.tasks).flat());
        return { ...state, boards: seeded.boards, tasks: seedTasksAsRecord(seeded.tasks) };
      },
      true,
    ),
  );
}

/** Re-bucket a flat KanbanTask[] back into the {boardSlug: KanbanTask[]} shape. */
function seedTasksAsRecord(
  flat: KanbanTask[],
): Record<string, KanbanTask[]> {
  const out: Record<string, KanbanTask[]> = {};
  for (const task of flat) {
    const board = "onboarding"; // V2.9 starter board only
    if (!out[board]) out[board] = [];
    out[board].push(task);
  }
  return out;
}

function resolveKanbanBoardSlug(
  state: StoredKanbanState,
  boardSlug?: string | null,
): string | null {
  const requestedBoard = boardSlug
    ? state.boards.find((board) => board.slug === boardSlug)?.slug ?? null
    : null;

  return (
    requestedBoard ||
    state.boards.find((board) => board.isCurrent)?.slug ||
    state.boards[0]?.slug ||
    null
  );
}

function resolveUniqueKanbanBoardSlug(
  state: StoredKanbanState,
  baseSlug: string,
  existingSlug?: string | null,
): string {
  let nextSlug = baseSlug;
  let suffix = 2;

  while (
    state.boards.some(
      (board) => board.slug === nextSlug && board.slug !== existingSlug,
    )
  ) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

function sanitizeKanbanStatus(value: string): string {
  const normalized = sanitizeText(value).toLowerCase();
  return VALID_KANBAN_STATUSES.has(normalized) ? normalized : "queued";
}

function clampKanbanPriority(value: number): number {
  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.max(1, Math.min(3, Math.round(value)));
}

function sanitizeKanbanSkills(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => sanitizeText(value)).filter(Boolean)),
  );
}

function syncKanbanTaskLifecycle(
  task: KanbanTask,
  previous: KanbanTask | null,
): KanbanTask {
  const createdAt = previous?.createdAt ?? task.createdAt ?? Date.now();

  switch (task.status) {
    case "queued":
      return {
        ...task,
        createdAt,
        startedAt: null,
        completedAt: null,
      };
    case "active":
      return {
        ...task,
        createdAt,
        startedAt: previous?.startedAt ?? task.startedAt ?? Date.now(),
        completedAt: null,
      };
    case "done":
    case "failed": {
      const startedAt = previous?.startedAt ?? task.startedAt ?? Date.now();

      return {
        ...task,
        createdAt,
        startedAt,
        completedAt: previous?.completedAt ?? task.completedAt ?? Date.now(),
      };
    }
    default:
      return {
        ...task,
        createdAt,
      };
  }
}

function defaultProfileName(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  const id = resolveRuntimeProviderId(runtimeProviderId);
  return `${id.charAt(0).toUpperCase()}${id.slice(1)} operator`;
}

function soulFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "SOUL.md");
}

function modelsFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "models.json");
}

function providersFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "providers.json");
}

function profilesFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "profiles.json");
}

function normalizeStoredProfiles(
  profiles: StoredWorkspaceProfile[],
): StoredWorkspaceProfile[] {
  if (profiles.length === 0) {
    return [];
  }

  const sanitized = profiles.map((profile, index) => ({
    name: sanitizeText(profile.name) || `${defaultProfileName()}-${index + 1}`,
    model: sanitizeText(profile.model) || "default",
    provider: sanitizeText(profile.provider) || "workspace",
    isDefault: profile.isDefault,
    kanbanBoardSlug: sanitizeText(profile.kanbanBoardSlug ?? "") || null,
  }));
  const defaultIndex = sanitized.findIndex((profile) => profile.isDefault);
  const resolvedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;
  const next = sanitized.map((profile, index) => ({
    ...profile,
    isDefault: index === resolvedDefaultIndex,
  }));

  return [
    next[resolvedDefaultIndex],
    ...next.filter((_, index) => index !== resolvedDefaultIndex),
  ];
}

function readStoredControlPlaneProfiles(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredWorkspaceProfile[] {
  return normalizeStoredProfiles(
    readJsonFile<StoredWorkspaceProfile[]>(profilesFilePath(runtimeProviderId), []),
  );
}

function listStoredControlPlaneProfiles(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredWorkspaceProfile[] {
  const storedProfiles = readStoredControlPlaneProfiles(runtimeProviderId);

  if (storedProfiles.length > 0) {
    return storedProfiles;
  }

  const models = listControlPlaneModels(runtimeProviderId);
  const providers = listControlPlaneProviders(runtimeProviderId);

  return normalizeStoredProfiles([
    {
      name: defaultProfileName(runtimeProviderId),
      model: models[0]?.model || "default",
      provider:
        models[0]?.provider ||
        providers[0]?.name ||
        providers[0]?.type ||
        resolveRuntimeProviderId(runtimeProviderId),
      isDefault: true,
      kanbanBoardSlug: null,
    },
  ]);
}

function skillsIndexFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "skills.json");
}

function skillsDirPath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "skills");
}

function skillDirectoryPath(
  slug: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string {
  return join(skillsDirPath(runtimeProviderId), slug);
}

function skillFilePath(
  slug: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string {
  return join(skillDirectoryPath(slug, runtimeProviderId), "SKILL.md");
}

function memoryFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "memory.json");
}

function toolsFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "tools.json");
}

function schedulesFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "schedules.json");
}

function sessionsFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "sessions.json");
}

function kanbanFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "kanban.json");
}

function codegraphFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "codegraph.json");
}

function everosFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "everos.json");
}

function dispatchRunsFilePath(runtimeProviderId?: PlatformRuntimeProviderId | null): string {
  return join(providerDir(runtimeProviderId), "dispatch-runs.json");
}

function sanitizeOptionalKanbanBoardSlug(value: string | null | undefined): string | null {
  const normalized = sanitizeText(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

function sanitizeOptionalScheduleId(value: string | null | undefined): string | null {
  const normalized = sanitizeText(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

function defaultCodeGraphQueries(): CodeGraphQueryTemplate[] {
  return [
    {
      id: createWorkspaceId("codegraph-query"),
      repoId: null,
      name: "Workflow entrypoints",
      mode: "workflow",
      query: "Find main entrypoints, routers, and operator-facing workflow boundaries.",
    },
    {
      id: createWorkspaceId("codegraph-query"),
      repoId: null,
      name: "Routing manifest",
      mode: "context",
      query: "Summarize request routing, top route files, and service boundaries for this repo.",
    },
    {
      id: createWorkspaceId("codegraph-query"),
      repoId: null,
      name: "Impact scan",
      mode: "impact",
      query: "Trace downstream callers, affected files, and adjacent workflows for a selected change.",
    },
  ];
}

function defaultCodeGraphState(): StoredCodeGraphState {
  return {
    repos: [],
    entrypoints: [],
    queries: defaultCodeGraphQueries(),
  };
}

function normalizeCodeGraphState(state: StoredCodeGraphState): StoredCodeGraphState {
  const repos = state.repos.map((repo, index) => ({
    id: sanitizeText(repo.id) || createWorkspaceId("codegraph-repo"),
    name: sanitizeText(repo.name) || `Repo ${index + 1}`,
    repoPath: sanitizeText(repo.repoPath),
    description: sanitizeText(repo.description),
    selected: repo.selected,
  }));
  const selectedIndex = repos.findIndex((repo) => repo.selected);
  const resolvedSelectedIndex = repos.length === 0 ? -1 : selectedIndex >= 0 ? selectedIndex : 0;

  return {
    repos: repos.map((repo, index) => ({
      ...repo,
      selected: index === resolvedSelectedIndex,
    })),
    entrypoints: state.entrypoints
      .map((entrypoint) => ({
        id: sanitizeText(entrypoint.id) || createWorkspaceId("codegraph-entrypoint"),
        repoId: sanitizeText(entrypoint.repoId),
        name: sanitizeText(entrypoint.name) || "Entrypoint",
        target: sanitizeText(entrypoint.target),
        notes: sanitizeText(entrypoint.notes),
      }))
      .filter((entrypoint) => entrypoint.repoId.length > 0),
    queries: state.queries.map((query, index) => ({
      id: sanitizeText(query.id) || createWorkspaceId("codegraph-query"),
      repoId: sanitizeText(query.repoId ?? "") || null,
      name: sanitizeText(query.name) || `Query ${index + 1}`,
      mode: query.mode,
      query: sanitizeText(query.query),
    })),
  };
}

function readCodeGraphState(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredCodeGraphState {
  return normalizeCodeGraphState(
    readJsonFile<StoredCodeGraphState>(
      codegraphFilePath(runtimeProviderId),
      defaultCodeGraphState(),
    ),
  );
}

function defaultEverOsState(): StoredEverOsState {
  return {
    harnesses: [],
  };
}

function normalizeEverOsState(
  state: StoredEverOsState,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredEverOsState {
  return {
    harnesses: state.harnesses.map((harness, index) => ({
      id: sanitizeText(harness.id) || createWorkspaceId("everos-harness"),
      name: sanitizeText(harness.name) || `Harness ${index + 1}`,
      description: sanitizeText(harness.description),
      memoryNamespace: sanitizeText(harness.memoryNamespace) || `memory-${index + 1}`,
      profile: sanitizeText(harness.profile) || defaultProfileName(runtimeProviderId),
      scheduleId: sanitizeOptionalScheduleId(harness.scheduleId),
      loopPrompt: sanitizeText(harness.loopPrompt),
      enabled: harness.enabled,
    })),
  };
}

function readEverOsState(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredEverOsState {
  // V2.9 pre-launch seed: 3 disabled Cubecloud-original harnesses.
  // Idempotent against the user's saved set; respects deletions.
  return normalizeEverOsState(
    readJsonFileWithSeed<StoredEverOsState>(
      everosFilePath(runtimeProviderId),
      defaultEverOsState(),
      (state) => ({ ...state, harnesses: seedDefaultHarnesses(state.harnesses) }),
      true,
    ),
    runtimeProviderId,
  );
}

function loadCodeGraphApi(): CodeGraphApi | null {
  try {
    const module = codegraphRequire("@colbymchenry/codegraph") as {
      CodeGraph?: CodeGraphApi;
      default?: { CodeGraph?: CodeGraphApi };
    };

    return module.CodeGraph ?? module.default?.CodeGraph ?? null;
  } catch {
    return null;
  }
}

function readCodeGraphStatValue(
  stats: Record<string, unknown> | null | undefined,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = stats?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function inspectCodeGraphRepo(repo: StoredCodeGraphRepo): CodeGraphRepoSummary {
  const exists = existsSync(repo.repoPath);
  const fallbackInitialized = existsSync(join(repo.repoPath, ".codegraph"));
  const codegraphApi = loadCodeGraphApi();
  const initialized = exists
    ? codegraphApi?.isInitialized?.(repo.repoPath) ?? fallbackInitialized
    : false;

  let fileCount: number | null = null;
  let nodeCount: number | null = null;
  let edgeCount: number | null = null;
  let detectedFrameworks: string[] = [];

  if (exists && initialized && codegraphApi?.openSync) {
    try {
      const graph = codegraphApi.openSync(repo.repoPath);
      const stats = graph.getStats?.();
      fileCount = readCodeGraphStatValue(stats, ["fileCount", "files", "totalFiles"]);
      nodeCount = readCodeGraphStatValue(stats, ["nodeCount", "nodes", "totalNodes"]);
      edgeCount = readCodeGraphStatValue(stats, ["edgeCount", "edges", "totalEdges"]);
      detectedFrameworks = graph.getDetectedFrameworks?.() ?? [];
      graph.close?.();
    } catch {
      fileCount = null;
      nodeCount = null;
      edgeCount = null;
      detectedFrameworks = [];
    }
  }

  return {
    ...repo,
    exists,
    initialized,
    fileCount,
    nodeCount,
    edgeCount,
    detectedFrameworks,
  };
}

function resolveLinkedKanbanBoardSlug(
  boardSlug: string | null | undefined,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string | null {
  const normalized = sanitizeOptionalKanbanBoardSlug(boardSlug);

  if (!normalized) {
    return null;
  }

  return readKanbanState(runtimeProviderId).boards.some((board) => board.slug === normalized)
    ? normalized
    : null;
}

function findProfileKanbanBoardSlug(
  profileName: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string | null {
  const normalizedProfileName = sanitizeText(profileName);
  const profile = listStoredControlPlaneProfiles(runtimeProviderId).find(
    (item) => item.name === normalizedProfileName,
  );

  return resolveLinkedKanbanBoardSlug(profile?.kanbanBoardSlug, runtimeProviderId);
}

function replaceKanbanBoardSlugAcrossControlPlane(
  currentSlug: string,
  nextSlug: string | null,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): void {
  const profiles = normalizeStoredProfiles(
    readStoredControlPlaneProfiles(runtimeProviderId).map((profile) => ({
      ...profile,
      kanbanBoardSlug:
        profile.kanbanBoardSlug === currentSlug ? nextSlug : profile.kanbanBoardSlug,
    })),
  );
  writeJsonFile(profilesFilePath(runtimeProviderId), profiles);

  const schedules = readJsonFile<AgentSchedule[]>(
    schedulesFilePath(runtimeProviderId),
    [],
  ).map((schedule) => ({
    ...schedule,
    kanbanBoardSlug:
      schedule.kanbanBoardSlug === currentSlug ? nextSlug : schedule.kanbanBoardSlug,
  }));
  writeJsonFile(schedulesFilePath(runtimeProviderId), schedules);

  const dispatchRuns = listStoredControlPlaneDispatchRuns(runtimeProviderId).map((run) => ({
    ...run,
    context: {
      ...run.context,
      kanbanBoardSlug:
        run.context.kanbanBoardSlug === currentSlug ? nextSlug : run.context.kanbanBoardSlug,
    },
  }));
  writeJsonFile(dispatchRunsFilePath(runtimeProviderId), dispatchRuns);
}

function listStoredControlPlaneDispatchRuns(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentDispatchRun[] {
  return readJsonFile<AgentDispatchRun[]>(dispatchRunsFilePath(runtimeProviderId), []).sort(
    (left, right) => right.createdAt - left.createdAt,
  );
}

function writeStoredControlPlaneDispatchRuns(
  runs: AgentDispatchRun[],
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentDispatchRun[] {
  const normalized = [...runs].sort((left, right) => right.createdAt - left.createdAt);
  writeJsonFile(dispatchRunsFilePath(runtimeProviderId), normalized);
  return normalized;
}

function upsertStoredControlPlaneDispatchRun(
  run: AgentDispatchRun,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentDispatchRun {
  const current = listStoredControlPlaneDispatchRuns(runtimeProviderId);
  writeStoredControlPlaneDispatchRuns(
    [run, ...current.filter((candidate) => candidate.id !== run.id)],
    runtimeProviderId,
  );
  return run;
}

function hasDispatchContextOverrideField(
  override: AgentDispatchContextOverride | null | undefined,
  field: keyof AgentDispatchContextOverride,
): boolean {
  return Boolean(override) && Object.prototype.hasOwnProperty.call(override, field);
}

function normalizeDispatchContextOverride(
  override: AgentDispatchContextOverride | null | undefined,
): AgentDispatchContextOverride | null {
  if (!override) {
    return null;
  }

  const normalized: AgentDispatchContextOverride = {};

  if (hasDispatchContextOverrideField(override, "codegraphRepoId")) {
    const repoId = sanitizeText(override.codegraphRepoId ?? "");
    normalized.codegraphRepoId = repoId.length > 0 ? repoId : null;
  }

  if (hasDispatchContextOverrideField(override, "codegraphQueryIds")) {
    normalized.codegraphQueryIds = Array.from(
      new Set((override.codegraphQueryIds ?? []).map((value) => sanitizeText(value)).filter(Boolean)),
    );
  }

  if (hasDispatchContextOverrideField(override, "everosHarnessIds")) {
    normalized.everosHarnessIds = Array.from(
      new Set((override.everosHarnessIds ?? []).map((value) => sanitizeText(value)).filter(Boolean)),
    );
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function resolveDispatchCodeGraphContext(
  contextOverride?: AgentDispatchContextOverride | null,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentDispatchCodeGraphContext | null {
  const state = readCodeGraphState(runtimeProviderId);
  const hasRepoOverride = hasDispatchContextOverrideField(contextOverride, "codegraphRepoId");

  if (hasRepoOverride && contextOverride?.codegraphRepoId === null) {
    return null;
  }

  const selectedRepo = hasRepoOverride
    ? state.repos.find((repo) => repo.id === contextOverride?.codegraphRepoId) ?? null
    : state.repos.find((repo) => repo.selected) ?? state.repos[0] ?? null;

  if (!selectedRepo) {
    return null;
  }

  const availableQueries = state.queries.filter(
    (query) => query.repoId == null || query.repoId === selectedRepo.id,
  );
  const hasQueryOverride = hasDispatchContextOverrideField(
    contextOverride,
    "codegraphQueryIds",
  );
  const selectedQueryIds = new Set(contextOverride?.codegraphQueryIds ?? []);

  return {
    repoId: selectedRepo.id,
    repoName: selectedRepo.name,
    repoPath: selectedRepo.repoPath,
    entrypoints: state.entrypoints.filter((entrypoint) => entrypoint.repoId === selectedRepo.id),
    queries: hasQueryOverride
      ? availableQueries.filter((query) => selectedQueryIds.has(query.id))
      : availableQueries,
  };
}

function resolveDispatchEverOsHarnesses(
  profileName: string,
  scheduleId?: string | null,
  contextOverride?: AgentDispatchContextOverride | null,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): EverOsHarness[] {
  const normalizedProfileName = sanitizeText(profileName);
  const normalizedScheduleId = sanitizeOptionalScheduleId(scheduleId);
  const hasHarnessOverride = hasDispatchContextOverrideField(
    contextOverride,
    "everosHarnessIds",
  );
  const selectedHarnessIds = new Set(contextOverride?.everosHarnessIds ?? []);

  return listControlPlaneEverOsHarnesses(runtimeProviderId).filter((harness) => {
    if (!harness.enabled) {
      return false;
    }

    if (hasHarnessOverride) {
      return selectedHarnessIds.has(harness.id);
    }

    return (
      harness.profile === normalizedProfileName ||
      (normalizedScheduleId != null && harness.scheduleId === normalizedScheduleId)
    );
  });
}

function buildDispatchSummary(args: {
  source: AgentDispatchRunSource;
  targetType: "profile" | "schedule";
  targetName: string;
  profile: string;
  prompt: string;
  kanbanBoardSlug: string | null;
  status: "queued" | "active" | "done" | "failed";
  codegraph: AgentDispatchCodeGraphContext | null;
  everosHarnesses: EverOsHarness[];
  error?: string | null;
}): string {
  const statusLabel =
    args.status === "queued"
      ? "Queued"
      : args.status === "active"
        ? "Active"
        : args.status === "done"
          ? "Completed"
          : "Failed";
  const lines = [
    `${statusLabel} ${args.targetType} dispatch: ${args.targetName}`,
    `Source: ${args.source}`,
    `Profile: ${args.profile}`,
    `Prompt: ${args.prompt || "No prompt recorded."}`,
    `Kanban board: ${args.kanbanBoardSlug ?? "No linked board"}`,
  ];

  if (args.codegraph?.repoName) {
    lines.push(`CodeGraph repo: ${args.codegraph.repoName}`);
  }

  if (args.codegraph?.entrypoints.length) {
    lines.push(
      `CodeGraph entrypoints: ${args.codegraph.entrypoints.map((entrypoint) => entrypoint.name).join(", ")}`,
    );
  }

  if (args.codegraph?.queries.length) {
    lines.push(
      `CodeGraph queries: ${args.codegraph.queries.map((query) => query.name).join(", ")}`,
    );
  }

  if (args.everosHarnesses.length) {
    lines.push(
      `EverOS harnesses: ${args.everosHarnesses.map((harness) => harness.name).join(", ")}`,
    );
  }

  if (args.error) {
    lines.push(`Error: ${args.error}`);
  }

  return lines.join("\n");
}

function setDispatchTaskState(args: {
  run: AgentDispatchRun;
  status: "queued" | "active" | "done" | "failed";
  body: string;
  runtimeProviderId?: PlatformRuntimeProviderId | null;
}): string | null {
  if (!args.run.taskId || !args.run.context.kanbanBoardSlug) {
    return null;
  }

  const nextTasks = saveControlPlaneKanbanTask(
    {
      id: args.run.taskId,
      boardSlug: args.run.context.kanbanBoardSlug,
      title: args.run.targetName,
      body: args.body,
      status: args.status,
      priority: 2,
      assignee: args.run.context.profile,
      skills: [],
    },
    args.runtimeProviderId,
  );

  return nextTasks.find((task) => task.id === args.run.taskId)?.status ?? args.status;
}

function createDispatchSessionRecord(
  run: AgentDispatchRun,
  assistantContent: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string | null {
  const profile = listControlPlaneProfiles(runtimeProviderId, false).find(
    (candidate) => candidate.name === run.context.profile,
  );
  const saved = saveControlPlaneSessionSnapshot(
    {
      model: profile?.model ?? "default",
      source: `dispatch:${run.source}`,
      history: [
        {
          kind: "user",
          id: 1,
          content:
            `Dispatch ${run.targetType}: ${run.targetName}\n` +
            `Profile: ${run.context.profile}\n` +
            `Prompt: ${run.context.prompt || "No prompt recorded."}`,
          timestamp: run.createdAt,
        },
        {
          kind: "assistant",
          id: 2,
          content: assistantContent,
          timestamp: Date.now(),
        },
      ],
    },
    runtimeProviderId,
  );

  return saved.sessionId;
}

function buildDispatchTaskBody(summary: string, output?: string | null): string {
  if (!output) {
    return summary;
  }

  return `${summary}\n\nResponse:\n${output}`;
}

async function executeControlPlaneDispatch(args: {
  source: AgentDispatchRunSource;
  targetType: "profile" | "schedule";
  targetId: string | null;
  targetName: string;
  profileName: string;
  prompt: string;
  kanbanBoardSlug: string | null;
  scheduleId?: string | null;
  contextOverride?: AgentDispatchContextOverride | null;
},
runtimeProviderId?: PlatformRuntimeProviderId | null,
): Promise<AgentDispatchRun> {
  const resolvedRuntimeProviderId = resolveRuntimeProviderId(runtimeProviderId);
  const profile = listControlPlaneProfiles(resolvedRuntimeProviderId, false).find(
    (candidate) => candidate.name === sanitizeText(args.profileName),
  );
  const contextOverride = normalizeDispatchContextOverride(args.contextOverride);
  const createdAt = Date.now();
  const codegraph = resolveDispatchCodeGraphContext(
    contextOverride,
    resolvedRuntimeProviderId,
  );
  const everosHarnesses = resolveDispatchEverOsHarnesses(
    args.profileName,
    args.scheduleId,
    contextOverride,
    resolvedRuntimeProviderId,
  );
  const queuedSummary = buildDispatchSummary({
    source: args.source,
    targetType: args.targetType,
    targetName: args.targetName,
    profile: args.profileName,
    prompt: args.prompt,
    kanbanBoardSlug: args.kanbanBoardSlug,
    status: "queued",
    codegraph,
    everosHarnesses,
  });

  let taskId: string | null = null;
  let taskStatus: string | null = null;

  if (args.kanbanBoardSlug) {
    const nextTasks = saveControlPlaneKanbanTask(
      {
        boardSlug: args.kanbanBoardSlug,
        title: args.targetName,
        body: queuedSummary,
        status: "queued",
        priority: 2,
        assignee: args.profileName,
        skills: [],
      },
      resolvedRuntimeProviderId,
    );
    taskId = nextTasks[0]?.id ?? null;
    taskStatus = nextTasks[0]?.status ?? null;
  }

  let run = upsertStoredControlPlaneDispatchRun(
    {
      id: createWorkspaceId("dispatch-run"),
      source: args.source,
      targetType: args.targetType,
      targetId: args.targetId,
      targetName: args.targetName,
      taskId,
      taskStatus,
      status: "queued",
      createdAt,
      startedAt: null,
      completedAt: null,
      output: null,
      error: null,
      sessionId: null,
      context: {
        profile: args.profileName,
        prompt: args.prompt,
        kanbanBoardSlug: args.kanbanBoardSlug,
        selection: contextOverride,
        codegraph,
        everosHarnesses,
      },
    },
    resolvedRuntimeProviderId,
  );

  try {
    const startedAt = Date.now();
    const activeSummary = buildDispatchSummary({
      source: args.source,
      targetType: args.targetType,
      targetName: args.targetName,
      profile: args.profileName,
      prompt: args.prompt,
      kanbanBoardSlug: args.kanbanBoardSlug,
      status: "active",
      codegraph,
      everosHarnesses,
    });
    taskStatus =
      setDispatchTaskState({
        run,
        status: "active",
        body: activeSummary,
        runtimeProviderId: resolvedRuntimeProviderId,
      }) ?? taskStatus;
    run = upsertStoredControlPlaneDispatchRun(
      {
        ...run,
        status: "active",
        startedAt,
        taskStatus,
      },
      resolvedRuntimeProviderId,
    );

    const runtimeOutput = controlPlaneDispatchRuntimeExecutor
      ? sanitizeText(
          (
            await controlPlaneDispatchRuntimeExecutor({
              runtimeProviderId: resolvedRuntimeProviderId,
              model: profile?.model ?? "default",
              source: args.source,
              targetType: args.targetType,
              targetId: args.targetId,
              targetName: args.targetName,
              prompt: args.prompt,
              context: run.context,
            })
          ).output,
        ) || "(no response)"
      : null;

    const completedAt = Date.now();
    const doneSummary = buildDispatchSummary({
      source: args.source,
      targetType: args.targetType,
      targetName: args.targetName,
      profile: args.profileName,
      prompt: args.prompt,
      kanbanBoardSlug: args.kanbanBoardSlug,
      status: "done",
      codegraph,
      everosHarnesses,
    });
    const taskBody = buildDispatchTaskBody(doneSummary, runtimeOutput);
    const sessionId = createDispatchSessionRecord(
      run,
      runtimeOutput ?? doneSummary,
      resolvedRuntimeProviderId,
    );
    taskStatus =
      setDispatchTaskState({
        run,
        status: "done",
        body: taskBody,
        runtimeProviderId: resolvedRuntimeProviderId,
      }) ?? taskStatus;

    return upsertStoredControlPlaneDispatchRun(
      {
        ...run,
        status: "done",
        completedAt,
        output: runtimeOutput ?? doneSummary,
        sessionId,
        taskStatus,
      },
      resolvedRuntimeProviderId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed.";
    const completedAt = Date.now();
    const failedSummary = buildDispatchSummary({
      source: args.source,
      targetType: args.targetType,
      targetName: args.targetName,
      profile: args.profileName,
      prompt: args.prompt,
      kanbanBoardSlug: args.kanbanBoardSlug,
      status: "failed",
      codegraph,
      everosHarnesses,
      error: message,
    });
    taskStatus =
      setDispatchTaskState({
        run,
        status: "failed",
        body: failedSummary,
        runtimeProviderId: resolvedRuntimeProviderId,
      }) ?? taskStatus;

    return upsertStoredControlPlaneDispatchRun(
      {
        ...run,
        status: "failed",
        startedAt: run.startedAt ?? completedAt,
        completedAt,
        output: failedSummary,
        error: message,
        taskStatus,
      },
      resolvedRuntimeProviderId,
    );
  }
}

function renderSkillContent(
  input: WorkspaceSkillInput,
  existingBody?: string,
): string {
  const name = sanitizeText(input.name) || "Workspace Skill";
  const description = sanitizeText(input.description) || "Workspace skill";
  const body = sanitizeText(
    input.content ?? existingBody ?? "Use this skill from Agent Desktop.",
  );
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}\n`;
}

function listStoredSkills(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredSkill[] {
  // V2.9 pre-launch seed: 3 user-visible Cubecloud-original skills.
  // Idempotent against the user's saved set; respects deletions.
  return readJsonFileWithSeed<StoredSkill[]>(
    skillsIndexFilePath(runtimeProviderId),
    [],
    seedDefaultSkills as (s: StoredSkill[]) => StoredSkill[],
    true,
  );
}

function listStoredWorkspaceSessions(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): StoredWorkspaceSession[] {
  return readJsonFile<StoredWorkspaceSession[]>(sessionsFilePath(runtimeProviderId), []).sort(
    (left, right) => right.updatedAt - left.updatedAt,
  );
}

export function readControlPlaneSoul(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string {
  const filePath = soulFilePath(runtimeProviderId);
  if (!existsSync(filePath)) {
    return "";
  }

  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function writeControlPlaneSoul(
  content: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): boolean {
  try {
    ensureDir(providerDir(runtimeProviderId));
    writeFileSync(soulFilePath(runtimeProviderId), content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function resetControlPlaneSoul(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): string {
  writeControlPlaneSoul(DEFAULT_AGENT_SOUL, runtimeProviderId);
  return DEFAULT_AGENT_SOUL;
}

export function listControlPlaneModels(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentModelEndpoint[] {
  return readJsonFile<AgentModelEndpoint[]>(modelsFilePath(runtimeProviderId), []);
}

export function saveControlPlaneModel(
  input: WorkspaceModelInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentModelEndpoint[] {
  const nextModel: AgentModelEndpoint = {
    id: input.id ?? createWorkspaceId("model"),
    name: sanitizeText(input.name) || "New model",
    provider: sanitizeText(input.provider) || "custom",
    model: sanitizeText(input.model) || "unset",
    baseUrl: sanitizeText(input.baseUrl),
    createdAt: Date.now(),
  };

  const current = listControlPlaneModels(runtimeProviderId);
  const next = current.some((item) => item.id === nextModel.id)
    ? current.map((item) =>
        item.id === nextModel.id
          ? { ...item, ...nextModel, createdAt: item.createdAt }
          : item,
      )
    : [...current, nextModel];
  writeJsonFile(modelsFilePath(runtimeProviderId), next);
  return next;
}

export function removeControlPlaneModel(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentModelEndpoint[] {
  const next = listControlPlaneModels(runtimeProviderId).filter(
    (item) => item.id !== id,
  );
  writeJsonFile(modelsFilePath(runtimeProviderId), next);
  return next;
}

export function listControlPlaneProviders(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentProviderConfig[] {
  return readJsonFile<AgentProviderConfig[]>(providersFilePath(runtimeProviderId), []);
}

export function saveControlPlaneProvider(
  input: WorkspaceProviderInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentProviderConfig[] {
  const nextProvider: AgentProviderConfig = {
    id: input.id ?? createWorkspaceId("provider"),
    name: sanitizeText(input.name) || "New provider",
    type: sanitizeText(input.type) || "custom",
    apiKey: input.apiKey.trim(),
    baseUrl: sanitizeText(input.baseUrl),
  };

  const current = listControlPlaneProviders(runtimeProviderId);
  const next = current.some((item) => item.id === nextProvider.id)
    ? current.map((item) =>
        item.id === nextProvider.id ? { ...item, ...nextProvider } : item,
      )
    : [...current, nextProvider];
  writeJsonFile(providersFilePath(runtimeProviderId), next);
  return next;
}

export function removeControlPlaneProvider(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentProviderConfig[] {
  const next = listControlPlaneProviders(runtimeProviderId).filter(
    (item) => item.id !== id,
  );
  writeJsonFile(providersFilePath(runtimeProviderId), next);
  return next;
}

export function listControlPlaneSkills(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSkill[] {
  return listStoredSkills(runtimeProviderId).map((skill) => ({
    name: skill.name,
    category: skill.category,
    description: skill.description,
    path: skillDirectoryPath(skill.slug, runtimeProviderId),
  }));
}

export function saveControlPlaneSkill(
  input: WorkspaceSkillInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSkill[] {
  const current = listStoredSkills(runtimeProviderId);
  const lookupName = sanitizeText(input.existingName || input.name);
  const existing = current.find((skill) => skill.name === lookupName);
  const slug = existing?.slug ?? sanitizeSkillSlug(input.name);
  const nextSkill: StoredSkill = {
    slug,
    name: sanitizeText(input.name) || "Workspace Skill",
    category: sanitizeText(input.category) || "workspace",
    description: sanitizeText(input.description) || "Workspace skill",
  };

  const skillsDir = skillDirectoryPath(slug, runtimeProviderId);
  ensureDir(skillsDir);

  const existingBody = existsSync(skillFilePath(slug, runtimeProviderId))
    ? readFileSync(skillFilePath(slug, runtimeProviderId), "utf-8")
        .split("\n\n")
        .slice(2)
        .join("\n\n")
    : undefined;

  writeFileSync(
    skillFilePath(slug, runtimeProviderId),
    renderSkillContent(input, existingBody),
    "utf-8",
  );

  const next = existing
    ? current.map((skill) =>
        skill.slug === existing.slug ? nextSkill : skill,
      )
    : [...current, nextSkill];
  writeJsonFile(skillsIndexFilePath(runtimeProviderId), next);
  return listControlPlaneSkills(runtimeProviderId);
}

export function removeControlPlaneSkill(
  name: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSkill[] {
  const current = listStoredSkills(runtimeProviderId);
  const existing = current.find((skill) => skill.name === name);
  const next = current.filter((skill) => skill.name !== name);

  if (existing) {
    rmSync(skillDirectoryPath(existing.slug, runtimeProviderId), {
      recursive: true,
      force: true,
    });
  }

  writeJsonFile(skillsIndexFilePath(runtimeProviderId), next);
  return listControlPlaneSkills(runtimeProviderId);
}

export function listControlPlaneMemory(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentMemoryEntry[] {
  return readJsonFileWithSeed<AgentMemoryEntry[]>(
    memoryFilePath(runtimeProviderId),
    [],
    seedDefaultMemories,
    true,
  );
}

export function saveControlPlaneMemoryEntry(
  input: WorkspaceMemoryInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentMemoryEntry[] {
  const nextEntry: AgentMemoryEntry = {
    id: input.id ?? createWorkspaceId("memory"),
    label: sanitizeText(input.label) || "Memory note",
    content: sanitizeText(input.content),
    createdAt: Date.now(),
  };

  const current = listControlPlaneMemory(runtimeProviderId);
  const next = current.some((item) => item.id === nextEntry.id)
    ? current.map((item) =>
        item.id === nextEntry.id
          ? { ...item, ...nextEntry, createdAt: item.createdAt }
          : item,
      )
    : [...current, nextEntry];
  writeJsonFile(memoryFilePath(runtimeProviderId), next);
  return next;
}

export function removeControlPlaneMemoryEntry(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentMemoryEntry[] {
  const next = listControlPlaneMemory(runtimeProviderId).filter(
    (item) => item.id !== id,
  );
  writeJsonFile(memoryFilePath(runtimeProviderId), next);
  return next;
}

export function listControlPlaneTools(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentTool[] {
  const storedTools = readJsonFile<AgentTool[]>(
    toolsFilePath(runtimeProviderId),
    DEFAULT_TOOLS,
  );
  const toolMap = new Map(DEFAULT_TOOLS.map((tool) => [tool.name, { ...tool }]));

  for (const tool of storedTools) {
    const current = toolMap.get(tool.name);
    toolMap.set(tool.name, {
      ...(current ?? tool),
      ...tool,
      endpoint: tool.endpoint || current?.endpoint || "",
      type: tool.type || current?.type || "custom",
    });
  }

  return Array.from(toolMap.values());
}

export function saveControlPlaneTool(
  input: WorkspaceToolInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentTool[] {
  const lookupName = sanitizeText(input.existingName || input.name);
  const current = listControlPlaneTools(runtimeProviderId);
  const existing = current.find((tool) => tool.name === lookupName) ?? null;
  const builtinTool = DEFAULT_TOOLS.find((tool) => tool.name === lookupName) ?? null;
  const nextTool: AgentTool =
    existing?.type === "builtin" || builtinTool
      ? {
          name: existing?.name || builtinTool?.name || lookupName || "workspace-tool",
          description:
            existing?.description || builtinTool?.description || "Workspace tool",
          endpoint: existing?.endpoint || builtinTool?.endpoint || "",
          type: existing?.type || builtinTool?.type || "builtin",
          enabled: input.enabled,
        }
      : {
          name: sanitizeText(input.name) || existing?.name || "workspace-tool",
          description:
            sanitizeText(input.description) || existing?.description || "Workspace tool",
          endpoint: sanitizeText(input.endpoint) || existing?.endpoint || "",
          type: sanitizeText(input.type) || existing?.type || "custom",
          enabled: input.enabled,
        };
  const next = current.some((tool) => tool.name === lookupName)
    ? current.map((tool) => (tool.name === lookupName ? nextTool : tool))
    : [...current, nextTool];

  writeJsonFile(toolsFilePath(runtimeProviderId), next);
  return next;
}

export function removeControlPlaneTool(
  name: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentTool[] {
  const next = listControlPlaneTools(runtimeProviderId).filter(
    (tool) => tool.name !== name,
  );
  writeJsonFile(toolsFilePath(runtimeProviderId), next);
  return next;
}

export function setControlPlaneToolEnabled(
  name: string,
  enabled: boolean,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentTool[] {
  const next = listControlPlaneTools(runtimeProviderId).map((tool) =>
    tool.name === name ? { ...tool, enabled } : tool,
  );
  writeJsonFile(toolsFilePath(runtimeProviderId), next);
  return next;
}

export function listControlPlaneDispatchRuns(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentDispatchRun[] {
  return listStoredControlPlaneDispatchRuns(runtimeProviderId);
}

export function listControlPlaneSchedules(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSchedule[] {
  return readJsonFileWithSeed<AgentSchedule[]>(
    schedulesFilePath(runtimeProviderId),
    [],
    seedDefaultSchedules,
    true,
  ).map(
    (schedule) => ({
      ...schedule,
      kanbanBoardSlug: resolveLinkedKanbanBoardSlug(
        schedule.kanbanBoardSlug,
        runtimeProviderId,
      ),
    }),
  );
}

export function saveControlPlaneSchedule(
  input: WorkspaceScheduleInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSchedule[] {
  const current = listControlPlaneSchedules(runtimeProviderId);
  const existing = input.id
    ? current.find((item) => item.id === input.id) ?? null
    : null;
  const nextSchedule: AgentSchedule = {
    id: input.id ?? createWorkspaceId("schedule"),
    name: sanitizeText(input.name) || "New schedule",
    cron: sanitizeText(input.cron) || "60m",
    prompt: sanitizeText(input.prompt),
    profile: sanitizeText(input.profile) || "default",
    kanbanBoardSlug:
      resolveLinkedKanbanBoardSlug(input.kanbanBoardSlug, runtimeProviderId) ??
      findProfileKanbanBoardSlug(input.profile, runtimeProviderId) ??
      existing?.kanbanBoardSlug ??
      null,
    enabled: input.enabled,
    nextRunAt: nextRunAtFromCron(input.cron, input.enabled),
    lastRunAt: null,
  };

  const next = current.some((item) => item.id === nextSchedule.id)
    ? current.map((item) =>
        item.id === nextSchedule.id
          ? {
              ...item,
              ...nextSchedule,
              lastRunAt: item.lastRunAt,
            }
          : item,
      )
    : [...current, nextSchedule];
  writeJsonFile(schedulesFilePath(runtimeProviderId), next);
  return next;
}

export function removeControlPlaneSchedule(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSchedule[] {
  const next = listControlPlaneSchedules(runtimeProviderId).filter(
    (item) => item.id !== id,
  );
  writeJsonFile(schedulesFilePath(runtimeProviderId), next);

  const everOsState = readEverOsState(runtimeProviderId);
  writeJsonFile(
    everosFilePath(runtimeProviderId),
    normalizeEverOsState(
      {
        harnesses: everOsState.harnesses.map((harness) => ({
          ...harness,
          scheduleId: harness.scheduleId === id ? null : harness.scheduleId,
        })),
      },
      runtimeProviderId,
    ),
  );

  return next;
}

export function setControlPlaneScheduleEnabled(
  id: string,
  enabled: boolean,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSchedule[] {
  const next = listControlPlaneSchedules(runtimeProviderId).map((item) =>
    item.id === id
      ? {
          ...item,
          enabled,
          nextRunAt: nextRunAtFromCron(item.cron, enabled),
        }
      : item,
  );
  writeJsonFile(schedulesFilePath(runtimeProviderId), next);
  return next;
}

export async function triggerControlPlaneSchedule(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
  source: AgentDispatchRunSource = "schedule",
  runAt = Date.now(),
  contextOverride?: AgentDispatchContextOverride | null,
): Promise<AgentSchedule[]> {
  const current = listControlPlaneSchedules(runtimeProviderId);
  const triggeredSchedule = current.find((item) => item.id === id) ?? null;
  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          lastRunAt: runAt,
          nextRunAt: nextRunAtFromCron(item.cron, item.enabled),
        }
      : item,
  );
  writeJsonFile(schedulesFilePath(runtimeProviderId), next);

  if (triggeredSchedule) {
    await executeControlPlaneDispatch(
      {
        source,
        targetType: "schedule",
        targetId: triggeredSchedule.id,
        targetName: triggeredSchedule.name,
        profileName: triggeredSchedule.profile,
        prompt: triggeredSchedule.prompt,
        kanbanBoardSlug: triggeredSchedule.kanbanBoardSlug ?? null,
        scheduleId: triggeredSchedule.id,
        contextOverride,
      },
      runtimeProviderId,
    );
  }

  return next;
}

export async function dispatchControlPlaneProfile(
  profileName: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
  contextOverride?: AgentDispatchContextOverride | null,
): Promise<AgentDispatchRun | null> {
  const profile = listControlPlaneProfiles(runtimeProviderId, false).find(
    (candidate) => candidate.name === sanitizeText(profileName),
  );

  if (!profile) {
    return null;
  }

  return executeControlPlaneDispatch(
    {
      source: "manual",
      targetType: "profile",
      targetId: null,
      targetName: profile.name,
      profileName: profile.name,
      prompt: `Direct lane dispatch for profile ${profile.name}.`,
      kanbanBoardSlug: profile.kanbanBoardSlug ?? null,
      contextOverride,
    },
    runtimeProviderId,
  );
}

export async function runDueControlPlaneSchedules(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
  now = Date.now(),
): Promise<AgentDispatchRun[]> {
  const dueSchedules = listControlPlaneSchedules(runtimeProviderId).filter(
    (schedule) => schedule.enabled && schedule.nextRunAt != null && schedule.nextRunAt <= now,
  );

  if (dueSchedules.length === 0) {
    return Promise.resolve([]);
  }

  return dueSchedules.reduce<Promise<AgentDispatchRun[]>>(async (runsPromise, schedule) => {
    const runs = await runsPromise;
    await triggerControlPlaneSchedule(schedule.id, runtimeProviderId, "scheduler", now);
    const run = listStoredControlPlaneDispatchRuns(runtimeProviderId).find(
      (candidate) => candidate.targetType === "schedule" && candidate.targetId === schedule.id,
    );

    return run ? [...runs, run] : runs;
  }, Promise.resolve([]));
}

export function listControlPlaneProfiles(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
  gatewayRunning = false,
): AgentProfile[] {
  const skills = listControlPlaneSkills(runtimeProviderId);

  return listStoredControlPlaneProfiles(runtimeProviderId).map((profile, index) => ({
    ...profile,
    isDefault: index === 0 ? true : profile.isDefault,
    kanbanBoardSlug: resolveLinkedKanbanBoardSlug(
      profile.kanbanBoardSlug,
      runtimeProviderId,
    ),
    skillCount: skills.length,
    gatewayRunning,
  }));
}

export function saveControlPlaneProfile(
  input: WorkspaceProfileInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentProfile[] {
  const lookupName = sanitizeText(input.existingName || input.name);
  const current = readStoredControlPlaneProfiles(runtimeProviderId);
  const fallbackProfiles =
    current.length === 0 ? listStoredControlPlaneProfiles(runtimeProviderId) : current;
  const existing = fallbackProfiles.find((profile) => profile.name === lookupName) ?? null;
  const baseProfiles =
    current.length === 0 && input.existingName && existing ? [existing] : current;
  const nextProfile: StoredWorkspaceProfile = {
    name:
      sanitizeText(input.name) || existing?.name || defaultProfileName(runtimeProviderId),
    model: sanitizeText(input.model) || existing?.model || "default",
    provider:
      sanitizeText(input.provider) ||
      existing?.provider ||
      resolveRuntimeProviderId(runtimeProviderId),
    isDefault: input.isDefault,
    kanbanBoardSlug: resolveLinkedKanbanBoardSlug(
      input.kanbanBoardSlug,
      runtimeProviderId,
    ),
  };
  const next = baseProfiles.some((profile) => profile.name === lookupName)
    ? baseProfiles.map((profile) =>
        profile.name === lookupName ? nextProfile : profile,
      )
    : [...baseProfiles, nextProfile];

  const normalizedProfiles = input.isDefault
    ? next.map((profile) =>
        profile.name === nextProfile.name
          ? profile
          : {
              ...profile,
              isDefault: false,
            },
      )
    : next;

  writeJsonFile(
    profilesFilePath(runtimeProviderId),
    normalizeStoredProfiles(normalizedProfiles),
  );
  return listControlPlaneProfiles(runtimeProviderId);
}

export function removeControlPlaneProfile(
  name: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentProfile[] {
  const next = normalizeStoredProfiles(
    readStoredControlPlaneProfiles(runtimeProviderId).filter(
      (profile) => profile.name !== name,
    ),
  );

  writeJsonFile(profilesFilePath(runtimeProviderId), next);

  const fallbackProfileName = next[0]?.name ?? defaultProfileName(runtimeProviderId);
  const everOsState = readEverOsState(runtimeProviderId);
  writeJsonFile(
    everosFilePath(runtimeProviderId),
    normalizeEverOsState(
      {
        harnesses: everOsState.harnesses.map((harness) => ({
          ...harness,
          profile: harness.profile === name ? fallbackProfileName : harness.profile,
        })),
      },
      runtimeProviderId,
    ),
  );

  return listControlPlaneProfiles(runtimeProviderId);
}

export function listControlPlaneCodeGraphRepos(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphRepoSummary[] {
  return readCodeGraphState(runtimeProviderId).repos.map((repo) =>
    inspectCodeGraphRepo(repo),
  );
}

export function saveControlPlaneCodeGraphRepo(
  input: WorkspaceCodeGraphRepoInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphRepoSummary[] {
  const state = readCodeGraphState(runtimeProviderId);
  const nextRepo: StoredCodeGraphRepo = {
    id: sanitizeText(input.id ?? "") || createWorkspaceId("codegraph-repo"),
    name: sanitizeText(input.name) || "Repository",
    repoPath: sanitizeText(input.repoPath),
    description: sanitizeText(input.description),
    selected: input.selected,
  };
  const hasExisting = state.repos.some((repo) => repo.id === nextRepo.id);
  const nextRepos = hasExisting
    ? state.repos.map((repo) => (repo.id === nextRepo.id ? nextRepo : repo))
    : [...state.repos, nextRepo];
  const selectedRepoId =
    nextRepo.selected || nextRepos.length === 1
      ? nextRepo.id
      : nextRepos.find((repo) => repo.selected)?.id ?? nextRepos[0]?.id ?? null;

  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      repos: nextRepos.map((repo) => ({
        ...repo,
        selected: repo.id === selectedRepoId,
      })),
      entrypoints: state.entrypoints,
      queries: state.queries,
    }),
  );

  return listControlPlaneCodeGraphRepos(runtimeProviderId);
}

export function removeControlPlaneCodeGraphRepo(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphRepoSummary[] {
  const state = readCodeGraphState(runtimeProviderId);
  const nextRepos = state.repos.filter((repo) => repo.id !== id);
  const selectedRepoId = nextRepos.find((repo) => repo.selected)?.id ?? nextRepos[0]?.id ?? null;

  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      repos: nextRepos.map((repo) => ({
        ...repo,
        selected: repo.id === selectedRepoId,
      })),
      entrypoints: state.entrypoints.filter((entrypoint) => entrypoint.repoId !== id),
      queries: state.queries.filter((query) => query.repoId !== id),
    }),
  );

  return listControlPlaneCodeGraphRepos(runtimeProviderId);
}

export function setCurrentControlPlaneCodeGraphRepo(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphRepoSummary[] {
  const state = readCodeGraphState(runtimeProviderId);
  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      repos: state.repos.map((repo) => ({
        ...repo,
        selected: repo.id === id,
      })),
      entrypoints: state.entrypoints,
      queries: state.queries,
    }),
  );

  return listControlPlaneCodeGraphRepos(runtimeProviderId);
}

export function listControlPlaneCodeGraphEntrypoints(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphEntrypoint[] {
  const state = readCodeGraphState(runtimeProviderId);
  const repoIds = new Set(state.repos.map((repo) => repo.id));

  return state.entrypoints.filter((entrypoint) => repoIds.has(entrypoint.repoId));
}

export function saveControlPlaneCodeGraphEntrypoint(
  input: WorkspaceCodeGraphEntrypointInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphEntrypoint[] {
  const state = readCodeGraphState(runtimeProviderId);

  if (!state.repos.some((repo) => repo.id === input.repoId)) {
    return listControlPlaneCodeGraphEntrypoints(runtimeProviderId);
  }

  const nextEntrypoint: CodeGraphEntrypoint = {
    id: sanitizeText(input.id ?? "") || createWorkspaceId("codegraph-entrypoint"),
    repoId: sanitizeText(input.repoId),
    name: sanitizeText(input.name) || "Entrypoint",
    target: sanitizeText(input.target),
    notes: sanitizeText(input.notes),
  };

  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      ...state,
      entrypoints: state.entrypoints.some((entrypoint) => entrypoint.id === nextEntrypoint.id)
        ? state.entrypoints.map((entrypoint) =>
            entrypoint.id === nextEntrypoint.id ? nextEntrypoint : entrypoint,
          )
        : [...state.entrypoints, nextEntrypoint],
    }),
  );

  return listControlPlaneCodeGraphEntrypoints(runtimeProviderId);
}

export function removeControlPlaneCodeGraphEntrypoint(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphEntrypoint[] {
  const state = readCodeGraphState(runtimeProviderId);
  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      ...state,
      entrypoints: state.entrypoints.filter((entrypoint) => entrypoint.id !== id),
    }),
  );

  return listControlPlaneCodeGraphEntrypoints(runtimeProviderId);
}

export function listControlPlaneCodeGraphQueries(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphQueryTemplate[] {
  const state = readCodeGraphState(runtimeProviderId);
  const repoIds = new Set(state.repos.map((repo) => repo.id));

  return state.queries.filter((query) => !query.repoId || repoIds.has(query.repoId));
}

export function saveControlPlaneCodeGraphQuery(
  input: WorkspaceCodeGraphQueryInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphQueryTemplate[] {
  const state = readCodeGraphState(runtimeProviderId);
  const repoId = sanitizeText(input.repoId ?? "") || null;

  if (repoId && !state.repos.some((repo) => repo.id === repoId)) {
    return listControlPlaneCodeGraphQueries(runtimeProviderId);
  }

  const nextQuery: CodeGraphQueryTemplate = {
    id: sanitizeText(input.id ?? "") || createWorkspaceId("codegraph-query"),
    repoId,
    name: sanitizeText(input.name) || "Query",
    mode: input.mode,
    query: sanitizeText(input.query),
  };

  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      ...state,
      queries: state.queries.some((query) => query.id === nextQuery.id)
        ? state.queries.map((query) => (query.id === nextQuery.id ? nextQuery : query))
        : [...state.queries, nextQuery],
    }),
  );

  return listControlPlaneCodeGraphQueries(runtimeProviderId);
}

export function removeControlPlaneCodeGraphQuery(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): CodeGraphQueryTemplate[] {
  const state = readCodeGraphState(runtimeProviderId);
  writeJsonFile(
    codegraphFilePath(runtimeProviderId),
    normalizeCodeGraphState({
      ...state,
      queries: state.queries.filter((query) => query.id !== id),
    }),
  );

  return listControlPlaneCodeGraphQueries(runtimeProviderId);
}

export async function initializeControlPlaneCodeGraphRepo(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): Promise<CodeGraphRepoSummary[]> {
  const repo = readCodeGraphState(runtimeProviderId).repos.find((item) => item.id === id);
  const codegraphApi = loadCodeGraphApi();

  if (!repo || !existsSync(repo.repoPath) || !codegraphApi?.init) {
    return listControlPlaneCodeGraphRepos(runtimeProviderId);
  }

  await codegraphApi.init(repo.repoPath, { index: true });
  return listControlPlaneCodeGraphRepos(runtimeProviderId);
}

export async function syncControlPlaneCodeGraphRepo(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): Promise<CodeGraphRepoSummary[]> {
  const repo = readCodeGraphState(runtimeProviderId).repos.find((item) => item.id === id);
  const codegraphApi = loadCodeGraphApi();

  if (!repo || !existsSync(repo.repoPath) || !codegraphApi?.open) {
    return listControlPlaneCodeGraphRepos(runtimeProviderId);
  }

  const graph = await codegraphApi.open(repo.repoPath);
  await graph.sync?.();
  await graph.indexAll?.();
  await graph.close?.();
  return listControlPlaneCodeGraphRepos(runtimeProviderId);
}

export function listControlPlaneEverOsHarnesses(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): EverOsHarness[] {
  const state = readEverOsState(runtimeProviderId);
  const scheduleIds = new Set(listControlPlaneSchedules(runtimeProviderId).map((schedule) => schedule.id));

  return state.harnesses.map((harness) => ({
    ...harness,
    scheduleId: harness.scheduleId && scheduleIds.has(harness.scheduleId)
      ? harness.scheduleId
      : null,
  }));
}

export function saveControlPlaneEverOsHarness(
  input: WorkspaceEverOsHarnessInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): EverOsHarness[] {
  const state = readEverOsState(runtimeProviderId);
  const nextHarness: EverOsHarness = {
    id: sanitizeText(input.id ?? "") || createWorkspaceId("everos-harness"),
    name: sanitizeText(input.name) || "Harness",
    description: sanitizeText(input.description),
    memoryNamespace: sanitizeText(input.memoryNamespace) || "memory",
    profile: sanitizeText(input.profile) || defaultProfileName(runtimeProviderId),
    scheduleId: sanitizeOptionalScheduleId(input.scheduleId),
    loopPrompt: sanitizeText(input.loopPrompt),
    enabled: input.enabled,
  };

  writeJsonFile(
    everosFilePath(runtimeProviderId),
    normalizeEverOsState(
      {
        harnesses: state.harnesses.some((harness) => harness.id === nextHarness.id)
          ? state.harnesses.map((harness) =>
              harness.id === nextHarness.id ? nextHarness : harness,
            )
          : [...state.harnesses, nextHarness],
      },
      runtimeProviderId,
    ),
  );

  return listControlPlaneEverOsHarnesses(runtimeProviderId);
}

export function removeControlPlaneEverOsHarness(
  id: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): EverOsHarness[] {
  const state = readEverOsState(runtimeProviderId);
  writeJsonFile(
    everosFilePath(runtimeProviderId),
    normalizeEverOsState(
      {
        harnesses: state.harnesses.filter((harness) => harness.id !== id),
      },
      runtimeProviderId,
    ),
  );

  return listControlPlaneEverOsHarnesses(runtimeProviderId);
}

export function setControlPlaneEverOsHarnessEnabled(
  id: string,
  enabled: boolean,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): EverOsHarness[] {
  const state = readEverOsState(runtimeProviderId);
  writeJsonFile(
    everosFilePath(runtimeProviderId),
    normalizeEverOsState(
      {
        harnesses: state.harnesses.map((harness) =>
          harness.id === id ? { ...harness, enabled } : harness,
        ),
      },
      runtimeProviderId,
    ),
  );

  return listControlPlaneEverOsHarnesses(runtimeProviderId);
}

export function listControlPlaneKanbanBoards(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanBoard[] {
  const state = readKanbanState(runtimeProviderId);

  return state.boards.map((board) => {
    const boardTasks = state.tasks[board.slug] ?? [];
    const counts = boardTasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      slug: board.slug,
      name: board.name,
      description: board.description,
      isCurrent: board.isCurrent,
      counts,
      total: boardTasks.length,
    };
  });
}

export function listControlPlaneKanbanTasks(
  boardSlug?: string | null,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanTask[] {
  const state = readKanbanState(runtimeProviderId);
  const activeBoardSlug = resolveKanbanBoardSlug(state, boardSlug);

  if (!activeBoardSlug) {
    return [];
  }

  return state.tasks[activeBoardSlug] ?? [];
}

export function setCurrentControlPlaneKanbanBoard(
  boardSlug: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanBoard[] {
  const state = readKanbanState(runtimeProviderId);
  if (!state.boards.some((board) => board.slug === boardSlug)) {
    return listControlPlaneKanbanBoards(runtimeProviderId);
  }

  writeJsonFile(kanbanFilePath(runtimeProviderId), {
    ...state,
    boards: state.boards.map((board) => ({
      ...board,
      isCurrent: board.slug === boardSlug,
    })),
  });

  return listControlPlaneKanbanBoards(runtimeProviderId);
}

export function saveControlPlaneKanbanBoard(
  input: WorkspaceKanbanBoardInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanBoard[] {
  const state = readKanbanState(runtimeProviderId);
  const existing = input.existingSlug
    ? state.boards.find((board) => board.slug === input.existingSlug) ?? null
    : null;
  const name = sanitizeText(input.name) || "Board";
  const description = sanitizeText(input.description) || null;
  const slug = resolveUniqueKanbanBoardSlug(
    state,
    sanitizeKanbanBoardSlug(name),
    existing?.slug ?? null,
  );
  const nextBoard: StoredKanbanBoard = {
    slug,
    name,
    description,
    isCurrent: existing?.isCurrent ?? true,
  };
  const nextBoards = existing
    ? state.boards.map((board) =>
        board.slug === existing.slug ? nextBoard : board,
      )
    : [
        nextBoard,
        ...state.boards.map((board) => ({
          ...board,
          isCurrent: false,
        })),
      ];
  const nextTasks = {
    ...state.tasks,
  };

  if (existing && existing.slug !== nextBoard.slug) {
    nextTasks[nextBoard.slug] = nextTasks[existing.slug] ?? [];
    delete nextTasks[existing.slug];
  }

  if (!existing) {
    nextTasks[nextBoard.slug] = nextTasks[nextBoard.slug] ?? [];
  }

  writeJsonFile(
    kanbanFilePath(runtimeProviderId),
    normalizeKanbanState({
      boards: nextBoards,
      tasks: nextTasks,
    }),
  );

  if (existing && existing.slug !== nextBoard.slug) {
    replaceKanbanBoardSlugAcrossControlPlane(
      existing.slug,
      nextBoard.slug,
      runtimeProviderId,
    );
  }

  return listControlPlaneKanbanBoards(runtimeProviderId);
}

export function removeControlPlaneKanbanBoard(
  slug: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanBoard[] {
  const state = readKanbanState(runtimeProviderId);

  if (state.boards.length <= 1 || !state.boards.some((board) => board.slug === slug)) {
    return listControlPlaneKanbanBoards(runtimeProviderId);
  }

  writeJsonFile(
    kanbanFilePath(runtimeProviderId),
    normalizeKanbanState({
      boards: state.boards.filter((board) => board.slug !== slug),
      tasks: Object.fromEntries(
        Object.entries(state.tasks).filter(([boardSlug]) => boardSlug !== slug),
      ),
    }),
  );

  replaceKanbanBoardSlugAcrossControlPlane(slug, null, runtimeProviderId);

  return listControlPlaneKanbanBoards(runtimeProviderId);
}

export function saveControlPlaneKanbanTask(
  input: WorkspaceKanbanTaskInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanTask[] {
  const state = readKanbanState(runtimeProviderId);
  const boardSlug = resolveKanbanBoardSlug(state, input.boardSlug);

  if (!boardSlug) {
    return [];
  }

  const currentTasks = state.tasks[boardSlug] ?? [];
  const existing = input.id
    ? currentTasks.find((task) => task.id === input.id) ?? null
    : null;
  const nextTask = syncKanbanTaskLifecycle(
    {
      id: input.id ?? createWorkspaceId("task"),
      title: sanitizeText(input.title) || "New task",
      body: sanitizeText(input.body) || null,
      status: sanitizeKanbanStatus(input.status),
      priority: clampKanbanPriority(input.priority),
      assignee: sanitizeText(input.assignee) || null,
      skills: sanitizeKanbanSkills(input.skills),
      createdAt: existing?.createdAt ?? Date.now(),
      startedAt: existing?.startedAt ?? null,
      completedAt: existing?.completedAt ?? null,
    },
    existing,
  );
  const nextTasks = currentTasks.some((task) => task.id === nextTask.id)
    ? currentTasks.map((task) => (task.id === nextTask.id ? nextTask : task))
    : [nextTask, ...currentTasks];

  writeJsonFile(kanbanFilePath(runtimeProviderId), {
    ...state,
    tasks: {
      ...state.tasks,
      [boardSlug]: nextTasks,
    },
  });

  return nextTasks;
}

export function removeControlPlaneKanbanTask(
  id: string,
  boardSlug?: string | null,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): KanbanTask[] {
  const state = readKanbanState(runtimeProviderId);
  const resolvedBoardSlug = resolveKanbanBoardSlug(state, boardSlug);

  if (!resolvedBoardSlug) {
    return [];
  }

  const nextTasks = (state.tasks[resolvedBoardSlug] ?? []).filter(
    (task) => task.id !== id,
  );

  writeJsonFile(kanbanFilePath(runtimeProviderId), {
    ...state,
    tasks: {
      ...state.tasks,
      [resolvedBoardSlug]: nextTasks,
    },
  });

  return nextTasks;
}

export function listControlPlaneSessions(
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentChatSession[] {
  return listStoredWorkspaceSessions(runtimeProviderId).map((session) => ({
    id: session.id,
    title: deriveSessionTitle(session.history, session.id, session.title),
    startedAt: session.startedAt,
    messageCount: session.messageCount,
    model: session.model,
    source: session.source,
  }));
}

export function getControlPlaneSessionHistory(
  sessionId: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentSessionHistoryItem[] {
  return (
    listStoredWorkspaceSessions(runtimeProviderId).find(
      (session) => session.id === sessionId,
    )?.history ?? []
  );
}

export function saveControlPlaneSessionSnapshot(
  input: WorkspaceSessionSnapshotInput,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): { sessionId: string; sessions: AgentChatSession[] } {
  const current = listStoredWorkspaceSessions(runtimeProviderId);
  const sessionId = input.sessionId ?? createWorkspaceId("session");
  const existing = current.find((session) => session.id === sessionId);
  const nextSession: StoredWorkspaceSession = {
    id: sessionId,
    title: normalizeSessionTitle(input.title ?? existing?.title),
    startedAt: existing?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
    messageCount: countTranscriptMessages(input.history),
    model: sanitizeText(input.model) || existing?.model || "default",
    source: sanitizeText(input.source ?? existing?.source ?? "cubecloud") || "cubecloud",
    history: input.history,
  };

  const next = existing
    ? current.map((session) =>
        session.id === sessionId ? nextSession : session,
      )
    : [nextSession, ...current];
  writeJsonFile(sessionsFilePath(runtimeProviderId), next);

  return {
    sessionId,
    sessions: listControlPlaneSessions(runtimeProviderId),
  };
}

export function updateControlPlaneSessionTitle(
  sessionId: string,
  title: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentChatSession[] {
  const next = listStoredWorkspaceSessions(runtimeProviderId).map((session) =>
    session.id === sessionId
      ? {
          ...session,
          title: normalizeSessionTitle(title),
          updatedAt: Date.now(),
        }
      : session,
  );
  writeJsonFile(sessionsFilePath(runtimeProviderId), next);
  return listControlPlaneSessions(runtimeProviderId);
}

export function deleteControlPlaneSession(
  sessionId: string,
  runtimeProviderId?: PlatformRuntimeProviderId | null,
): AgentChatSession[] {
  const next = listStoredWorkspaceSessions(runtimeProviderId).filter(
    (session) => session.id !== sessionId,
  );
  writeJsonFile(sessionsFilePath(runtimeProviderId), next);
  return listControlPlaneSessions(runtimeProviderId);
}