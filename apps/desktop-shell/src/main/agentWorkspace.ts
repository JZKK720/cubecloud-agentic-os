import { randomUUID } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { app } from "electron";
import type {
  AgentMemoryEntry,
  AgentModelEndpoint,
  AgentProfile,
  AgentProviderConfig,
  AgentSchedule,
  AgentSkill,
  AgentTool,
} from "@cubecloud/platform-core";

interface StoredWorkspaceProfile {
  name: string;
  model: string;
  provider: string;
  isDefault: boolean;
  kanbanBoardSlug?: string | null;
}

export interface WorkspaceModelInput {
  id?: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
}

export interface WorkspaceProviderInput {
  id?: string;
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string;
}

export interface WorkspaceSkillInput {
  name: string;
  category: string;
  description: string;
  content?: string;
  existingName?: string;
}

export interface WorkspaceMemoryInput {
  id?: string;
  label: string;
  content: string;
}

export interface WorkspaceToolInput {
  name: string;
  description: string;
  endpoint: string;
  type: string;
  enabled: boolean;
  existingName?: string;
}

export interface WorkspaceProfileInput {
  name: string;
  model: string;
  provider: string;
  isDefault: boolean;
  kanbanBoardSlug?: string | null;
  existingName?: string;
}

export interface WorkspaceKanbanTaskInput {
  id?: string;
  boardSlug?: string | null;
  title: string;
  body: string;
  status: string;
  priority: number;
  assignee: string;
  skills: string[];
}

export interface WorkspaceKanbanBoardInput {
  name: string;
  description: string;
  existingSlug?: string;
}

export interface WorkspaceScheduleInput {
  id?: string;
  name: string;
  cron: string;
  prompt: string;
  profile: string;
  kanbanBoardSlug?: string | null;
  enabled: boolean;
}

export interface WorkspaceCodeGraphRepoInput {
  id?: string;
  name: string;
  repoPath: string;
  description: string;
  selected: boolean;
}

export interface WorkspaceCodeGraphEntrypointInput {
  id?: string;
  repoId: string;
  name: string;
  target: string;
  notes: string;
}

export interface WorkspaceCodeGraphQueryInput {
  id?: string;
  repoId?: string | null;
  name: string;
  mode: "context" | "search" | "impact" | "workflow";
  query: string;
}

export interface WorkspaceEverOsHarnessInput {
  id?: string;
  name: string;
  description: string;
  memoryNamespace: string;
  profile: string;
  scheduleId?: string | null;
  loopPrompt: string;
  enabled: boolean;
}

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

function workspaceDir(): string {
  return join(app.getPath("userData"), "agent-workspace");
}

function ensureWorkspaceDir(): void {
  const dirPath = workspaceDir();
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
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

function writeJsonFile(filePath: string, value: unknown): void {
  ensureWorkspaceDir();
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

function modelsFilePath(): string {
  return join(workspaceDir(), "models.json");
}

function providersFilePath(): string {
  return join(workspaceDir(), "providers.json");
}

function skillsIndexFilePath(): string {
  return join(workspaceDir(), "skills.json");
}

function skillsDirPath(): string {
  return join(workspaceDir(), "skills");
}

function memoryFilePath(): string {
  return join(workspaceDir(), "memory.json");
}

function toolsFilePath(): string {
  return join(workspaceDir(), "tools.json");
}

function profilesFilePath(): string {
  return join(workspaceDir(), "profiles.json");
}

function schedulesFilePath(): string {
  return join(workspaceDir(), "schedules.json");
}

function defaultProfileName(): string {
  return "default";
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

function readStoredWorkspaceProfiles(): StoredWorkspaceProfile[] {
  return normalizeStoredProfiles(
    readJsonFile<StoredWorkspaceProfile[]>(profilesFilePath(), []),
  );
}

function listStoredWorkspaceProfiles(): StoredWorkspaceProfile[] {
  const storedProfiles = readStoredWorkspaceProfiles();
  if (storedProfiles.length > 0) {
    return storedProfiles;
  }

  const models = listWorkspaceModels();
  const providers = listWorkspaceProviders();

  return normalizeStoredProfiles([
    {
      name: defaultProfileName(),
      model: models[0]?.model || "default",
      provider: models[0]?.provider || providers[0]?.name || providers[0]?.type || "workspace",
      isDefault: true,
    },
  ]);
}

export function listWorkspaceProfiles(gatewayRunning = false): AgentProfile[] {
  const skills = listWorkspaceSkills();

  return listStoredWorkspaceProfiles().map((profile) => ({
    ...profile,
    skillCount: skills.length,
    gatewayRunning,
  }));
}

export function saveWorkspaceProfile(input: WorkspaceProfileInput): AgentProfile[] {
  const lookupName = sanitizeText(input.existingName || input.name);
  const current = readStoredWorkspaceProfiles();
  const fallbackProfiles = current.length === 0 ? listStoredWorkspaceProfiles() : current;
  const existing = fallbackProfiles.find((profile) => profile.name === lookupName) ?? null;
  const baseProfiles =
    current.length === 0 && input.existingName && existing ? [existing] : current;
  const nextProfile: StoredWorkspaceProfile = {
    name: sanitizeText(input.name) || existing?.name || defaultProfileName(),
    model: sanitizeText(input.model) || existing?.model || "default",
    provider: sanitizeText(input.provider) || existing?.provider || "workspace",
    isDefault: input.isDefault,
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

  writeJsonFile(profilesFilePath(), normalizeStoredProfiles(normalizedProfiles));
  return listWorkspaceProfiles();
}

export function removeWorkspaceProfile(name: string): AgentProfile[] {
  const next = normalizeStoredProfiles(
    readStoredWorkspaceProfiles().filter((profile) => profile.name !== name),
  );

  writeJsonFile(profilesFilePath(), next);
  return listWorkspaceProfiles();
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

export function listWorkspaceModels(): AgentModelEndpoint[] {
  return readJsonFile<AgentModelEndpoint[]>(modelsFilePath(), []);
}

export function saveWorkspaceModel(
  input: WorkspaceModelInput,
): AgentModelEndpoint[] {
  const nextModel: AgentModelEndpoint = {
    id: input.id ?? createWorkspaceId("model"),
    name: sanitizeText(input.name) || "New model",
    provider: sanitizeText(input.provider) || "custom",
    model: sanitizeText(input.model) || "unset",
    baseUrl: sanitizeText(input.baseUrl),
    createdAt: Date.now(),
  };
  const current = listWorkspaceModels();
  const existing = current.find((item) => item.id === nextModel.id);
  const next = existing
    ? current.map((item) =>
        item.id === nextModel.id
          ? { ...item, ...nextModel, createdAt: item.createdAt }
          : item,
      )
    : [...current, nextModel];
  writeJsonFile(modelsFilePath(), next);
  return next;
}

export function removeWorkspaceModel(id: string): AgentModelEndpoint[] {
  const next = listWorkspaceModels().filter((item) => item.id !== id);
  writeJsonFile(modelsFilePath(), next);
  return next;
}

export function listWorkspaceProviders(): AgentProviderConfig[] {
  return readJsonFile<AgentProviderConfig[]>(providersFilePath(), []);
}

export function saveWorkspaceProvider(
  input: WorkspaceProviderInput,
): AgentProviderConfig[] {
  const nextProvider: AgentProviderConfig = {
    id: input.id ?? createWorkspaceId("provider"),
    name: sanitizeText(input.name) || "New provider",
    type: sanitizeText(input.type) || "custom",
    apiKey: input.apiKey.trim(),
    baseUrl: sanitizeText(input.baseUrl),
  };
  const current = listWorkspaceProviders();
  const next = current.some((item) => item.id === nextProvider.id)
    ? current.map((item) =>
        item.id === nextProvider.id ? { ...item, ...nextProvider } : item,
      )
    : [...current, nextProvider];
  writeJsonFile(providersFilePath(), next);
  return next;
}

export function removeWorkspaceProvider(id: string): AgentProviderConfig[] {
  const next = listWorkspaceProviders().filter((item) => item.id !== id);
  writeJsonFile(providersFilePath(), next);
  return next;
}

type StoredSkill = Omit<AgentSkill, "path"> & { slug: string };

function listStoredSkills(): StoredSkill[] {
  return readJsonFile<StoredSkill[]>(skillsIndexFilePath(), []);
}

function skillDirectoryPath(slug: string): string {
  return join(skillsDirPath(), slug);
}

function skillFilePath(slug: string): string {
  return join(skillDirectoryPath(slug), "SKILL.md");
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

export function listWorkspaceSkills(): AgentSkill[] {
  return listStoredSkills().map((skill) => ({
    name: skill.name,
    category: skill.category,
    description: skill.description,
    path: skillDirectoryPath(skill.slug),
  }));
}

export function saveWorkspaceSkill(input: WorkspaceSkillInput): AgentSkill[] {
  const current = listStoredSkills();
  const lookupName = sanitizeText(input.existingName || input.name);
  const existing = current.find((skill) => skill.name === lookupName);
  const slug = existing?.slug ?? sanitizeSkillSlug(input.name);
  const nextSkill: StoredSkill = {
    slug,
    name: sanitizeText(input.name) || "Workspace Skill",
    category: sanitizeText(input.category) || "workspace",
    description: sanitizeText(input.description) || "Workspace skill",
  };

  const skillsDir = skillDirectoryPath(slug);
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true });
  }
  const existingBody = existsSync(skillFilePath(slug))
    ? readFileSync(skillFilePath(slug), "utf-8")
        .split("\n\n")
        .slice(2)
        .join("\n\n")
    : undefined;
  writeFileSync(
    skillFilePath(slug),
    renderSkillContent(input, existingBody),
    "utf-8",
  );

  const next = existing
    ? current.map((skill) =>
        skill.slug === existing.slug ? nextSkill : skill,
      )
    : [...current, nextSkill];
  writeJsonFile(skillsIndexFilePath(), next);
  return listWorkspaceSkills();
}

export function removeWorkspaceSkill(name: string): AgentSkill[] {
  const current = listStoredSkills();
  const existing = current.find((skill) => skill.name === name);
  const next = current.filter((skill) => skill.name !== name);

  if (existing) {
    rmSync(skillDirectoryPath(existing.slug), { recursive: true, force: true });
  }

  writeJsonFile(skillsIndexFilePath(), next);
  return listWorkspaceSkills();
}

export function listWorkspaceMemory(): AgentMemoryEntry[] {
  return readJsonFile<AgentMemoryEntry[]>(memoryFilePath(), []);
}

export function saveWorkspaceMemoryEntry(
  input: WorkspaceMemoryInput,
): AgentMemoryEntry[] {
  const nextEntry: AgentMemoryEntry = {
    id: input.id ?? createWorkspaceId("memory"),
    label: sanitizeText(input.label) || "Memory note",
    content: sanitizeText(input.content),
    createdAt: Date.now(),
  };
  const current = listWorkspaceMemory();
  const next = current.some((item) => item.id === nextEntry.id)
    ? current.map((item) =>
        item.id === nextEntry.id
          ? { ...item, ...nextEntry, createdAt: item.createdAt }
          : item,
      )
    : [...current, nextEntry];
  writeJsonFile(memoryFilePath(), next);
  return next;
}

export function removeWorkspaceMemoryEntry(id: string): AgentMemoryEntry[] {
  const next = listWorkspaceMemory().filter((item) => item.id !== id);
  writeJsonFile(memoryFilePath(), next);
  return next;
}

export function listWorkspaceTools(): AgentTool[] {
  const storedTools = readJsonFile<AgentTool[]>(toolsFilePath(), DEFAULT_TOOLS);
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

export function saveWorkspaceTool(input: WorkspaceToolInput): AgentTool[] {
  const lookupName = sanitizeText(input.existingName || input.name);
  const current = listWorkspaceTools();
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

  writeJsonFile(toolsFilePath(), next);
  return next;
}

export function removeWorkspaceTool(name: string): AgentTool[] {
  const next = listWorkspaceTools().filter((tool) => tool.name !== name);
  writeJsonFile(toolsFilePath(), next);
  return next;
}

export function setWorkspaceToolEnabled(
  name: string,
  enabled: boolean,
): AgentTool[] {
  const next = listWorkspaceTools().map((tool) =>
    tool.name === name ? { ...tool, enabled } : tool,
  );
  writeJsonFile(toolsFilePath(), next);
  return next;
}

export function listWorkspaceSchedules(): AgentSchedule[] {
  return readJsonFile<AgentSchedule[]>(schedulesFilePath(), []);
}

export function saveWorkspaceSchedule(
  input: WorkspaceScheduleInput,
): AgentSchedule[] {
  const nextSchedule: AgentSchedule = {
    id: input.id ?? createWorkspaceId("schedule"),
    name: sanitizeText(input.name) || "New schedule",
    cron: sanitizeText(input.cron) || "60m",
    prompt: sanitizeText(input.prompt),
    profile: sanitizeText(input.profile) || "default",
    enabled: input.enabled,
    nextRunAt: nextRunAtFromCron(input.cron, input.enabled),
    lastRunAt: null,
  };
  const current = listWorkspaceSchedules();
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
  writeJsonFile(schedulesFilePath(), next);
  return next;
}

export function removeWorkspaceSchedule(id: string): AgentSchedule[] {
  const next = listWorkspaceSchedules().filter((item) => item.id !== id);
  writeJsonFile(schedulesFilePath(), next);
  return next;
}

export function setWorkspaceScheduleEnabled(
  id: string,
  enabled: boolean,
): AgentSchedule[] {
  const next = listWorkspaceSchedules().map((item) =>
    item.id === id
      ? {
          ...item,
          enabled,
          nextRunAt: nextRunAtFromCron(item.cron, enabled),
        }
      : item,
  );
  writeJsonFile(schedulesFilePath(), next);
  return next;
}

export function triggerWorkspaceSchedule(id: string): AgentSchedule[] {
  const next = listWorkspaceSchedules().map((item) =>
    item.id === id
      ? {
          ...item,
          lastRunAt: Date.now(),
          nextRunAt: nextRunAtFromCron(item.cron, item.enabled),
        }
      : item,
  );
  writeJsonFile(schedulesFilePath(), next);
  return next;
}