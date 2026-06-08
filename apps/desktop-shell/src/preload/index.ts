import { contextBridge, ipcRenderer } from "electron";
import type {
  AgentChatSession,
  AgentDispatchContextOverride,
  AgentDispatchRun,
  CodeGraphEntrypoint,
  CodeGraphQueryTemplate,
  CodeGraphRepoSummary,
  EverOsHarness,
  HermesRuntimeLifecycleSummary,
  AgentProviderConfig,
  AgentSchedule,
  AgentSessionHistoryItem,
  AgentSkill,
  AgentTool,
  AgentMemoryEntry,
  AgentModelEndpoint,
  AgentProfile,
  KanbanBoard,
  KanbanTask,
  PlatformCustomAppOnboardingInput,
  PlatformMissionStage,
  PlatformOverview,
  PlatformRuntimeProviderId,
  PlatformRuntimeSurfaceMode,
  PlatformRuntimeSurfacePatch,
  PlatformServiceTier,
  PlatformSmokeTargetPatch,
  PlatformTaskOrchestratorId,
  PlatformSurfaceProtocol,
  PlatformView,
} from "@cubecloud/platform-core";
import type {
  WorkspaceKanbanBoardInput,
  WorkspaceKanbanTaskInput,
  WorkspaceCodeGraphEntrypointInput,
  WorkspaceCodeGraphQueryInput,
  WorkspaceCodeGraphRepoInput,
  WorkspaceEverOsHarnessInput,
  WorkspaceMemoryInput,
  WorkspaceModelInput,
  WorkspaceProfileInput,
  WorkspaceProviderInput,
  WorkspaceScheduleInput,
  WorkspaceSkillInput,
  WorkspaceToolInput,
} from "../main/agentWorkspace";
import type { WorkspaceSessionSnapshotInput } from "../main/agentControlPlane";
import type { AgentProviderDiscoveryResult } from "../shared/providerCatalog";

const platformAPI = {
  getOverview: (): Promise<PlatformOverview> => ipcRenderer.invoke("platform:getOverview"),
  refreshDockerNodes: (): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:refreshDockerNodes"),
  onboardDockerNodeAsCustomApp: (
    input: PlatformCustomAppOnboardingInput,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:onboardDockerNodeAsCustomApp", input),
  setDockerNodeBinding: (
    nodeKey: string,
    appId: string | null,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setDockerNodeBinding", nodeKey, appId),
  setAppEnabled: (
    appId: string,
    enabled: boolean,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setAppEnabled", appId, enabled),
  setActiveView: (view: PlatformView): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setActiveView", view),
  setActiveRuntimeProvider: (
    runtimeProviderId: PlatformRuntimeProviderId,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setActiveRuntimeProvider", runtimeProviderId),
  setActiveTaskOrchestrator: (
    taskOrchestratorId: PlatformTaskOrchestratorId,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setActiveTaskOrchestrator", taskOrchestratorId),
  setMissionCardStage: (
    cardId: string,
    stage: PlatformMissionStage,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setMissionCardStage", cardId, stage),
  toggleMissionChecklistItem: (
    cardId: string,
    checklistItemId: string,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke(
      "platform:toggleMissionChecklistItem",
      cardId,
      checklistItemId,
    ),
  setMissionCardServiceTier: (
    cardId: string,
    serviceTier: PlatformServiceTier,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke(
      "platform:setMissionCardServiceTier",
      cardId,
      serviceTier,
    ),
  setRuntimeSurfaceConfig: (
    appId: string,
    patch: PlatformRuntimeSurfacePatch,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setRuntimeSurfaceConfig", appId, patch),
  setSmokeTargetConfig: (
    targetId: string,
    patch: PlatformSmokeTargetPatch,
  ): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:setSmokeTargetConfig", targetId, patch),
  runSmokeTarget: (targetId: string): Promise<PlatformOverview> =>
    ipcRenderer.invoke("platform:runSmokeTarget", targetId),
  openRuntimeSurface: (appId: string): Promise<boolean> =>
    ipcRenderer.invoke("platform:openRuntimeSurface", appId),
  openHermesGatewayLog: (): Promise<string | null> =>
    ipcRenderer.invoke("platform:openHermesGatewayLog"),
  getHermesRuntimeLifecycle: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:getHermesRuntimeLifecycle"),
  verifyHermesRuntime: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:verifyHermesRuntime"),
  installHermesRuntime: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:installHermesRuntime"),
  repairHermesRuntime: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:repairHermesRuntime"),
  updateHermesRuntime: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:updateHermesRuntime"),
  runHermesDoctor: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:runHermesDoctor"),
  startHermesGateway: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:startHermesGateway"),
  stopHermesGateway: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:stopHermesGateway"),
  adoptHermesHome: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:adoptHermesHome"),
  resetHermesHomeAdoption: (): Promise<HermesRuntimeLifecycleSummary> =>
    ipcRenderer.invoke("platform:resetHermesHomeAdoption"),
  subscribeHermesRuntimeLifecycle: (
    listener: (summary: HermesRuntimeLifecycleSummary) => void,
  ): (() => void) => {
    const handler = (
      _event: unknown,
      payload: { summary: HermesRuntimeLifecycleSummary },
    ) => {
      listener(payload.summary);
    };

    ipcRenderer.on("platform:hermesRuntimeLifecycleUpdated", handler);

    return () => {
      ipcRenderer.removeListener("platform:hermesRuntimeLifecycleUpdated", handler);
    };
  },
  listAgentSessions: (): Promise<AgentChatSession[]> =>
    ipcRenderer.invoke("platform:listAgentSessions"),
  getAgentSessionHistory: (sessionId: string): Promise<AgentSessionHistoryItem[]> =>
    ipcRenderer.invoke("platform:getAgentSessionHistory", sessionId),
  saveAgentSessionSnapshot: (input: WorkspaceSessionSnapshotInput): Promise<{
    sessionId: string;
    sessions: AgentChatSession[];
  }> => ipcRenderer.invoke("platform:saveAgentSessionSnapshot", input),
  updateAgentSessionTitle: (
    sessionId: string,
    title: string,
  ): Promise<AgentChatSession[]> =>
    ipcRenderer.invoke("platform:updateAgentSessionTitle", sessionId, title),
  deleteAgentSession: (sessionId: string): Promise<AgentChatSession[]> =>
    ipcRenderer.invoke("platform:deleteAgentSession", sessionId),
  readSoul: (): Promise<string> => ipcRenderer.invoke("platform:readSoul"),
  writeSoul: (content: string): Promise<boolean> =>
    ipcRenderer.invoke("platform:writeSoul", content),
  resetSoul: (): Promise<string> => ipcRenderer.invoke("platform:resetSoul"),
  listWorkspaceProfiles: (): Promise<AgentProfile[]> =>
    ipcRenderer.invoke("platform:listWorkspaceProfiles"),
  saveWorkspaceProfile: (input: WorkspaceProfileInput): Promise<AgentProfile[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceProfile", input),
  removeWorkspaceProfile: (name: string): Promise<AgentProfile[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceProfile", name),
  listWorkspaceModels: (): Promise<AgentModelEndpoint[]> =>
    ipcRenderer.invoke("platform:listWorkspaceModels"),
  saveWorkspaceModel: (input: WorkspaceModelInput): Promise<AgentModelEndpoint[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceModel", input),
  removeWorkspaceModel: (id: string): Promise<AgentModelEndpoint[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceModel", id),
  listWorkspaceProviders: (): Promise<AgentProviderConfig[]> =>
    ipcRenderer.invoke("platform:listWorkspaceProviders"),
  discoverProviderModels: (
    providerType: string,
    baseUrl?: string,
    apiKey?: string,
  ): Promise<AgentProviderDiscoveryResult> =>
    ipcRenderer.invoke("platform:discoverProviderModels", providerType, baseUrl, apiKey),
  saveWorkspaceProvider: (
    input: WorkspaceProviderInput,
  ): Promise<AgentProviderConfig[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceProvider", input),
  removeWorkspaceProvider: (id: string): Promise<AgentProviderConfig[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceProvider", id),
  listWorkspaceSkills: (): Promise<AgentSkill[]> =>
    ipcRenderer.invoke("platform:listWorkspaceSkills"),
  saveWorkspaceSkill: (input: WorkspaceSkillInput): Promise<AgentSkill[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceSkill", input),
  removeWorkspaceSkill: (name: string): Promise<AgentSkill[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceSkill", name),
  listWorkspaceMemory: (): Promise<AgentMemoryEntry[]> =>
    ipcRenderer.invoke("platform:listWorkspaceMemory"),
  saveWorkspaceMemoryEntry: (
    input: WorkspaceMemoryInput,
  ): Promise<AgentMemoryEntry[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceMemoryEntry", input),
  removeWorkspaceMemoryEntry: (id: string): Promise<AgentMemoryEntry[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceMemoryEntry", id),
  listWorkspaceTools: (): Promise<AgentTool[]> =>
    ipcRenderer.invoke("platform:listWorkspaceTools"),
  saveWorkspaceTool: (input: WorkspaceToolInput): Promise<AgentTool[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceTool", input),
  removeWorkspaceTool: (name: string): Promise<AgentTool[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceTool", name),
  setWorkspaceToolEnabled: (
    name: string,
    enabled: boolean,
  ): Promise<AgentTool[]> =>
    ipcRenderer.invoke("platform:setWorkspaceToolEnabled", name, enabled),
  listWorkspaceSchedules: (): Promise<AgentSchedule[]> =>
    ipcRenderer.invoke("platform:listWorkspaceSchedules"),
  saveWorkspaceSchedule: (
    input: WorkspaceScheduleInput,
  ): Promise<AgentSchedule[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceSchedule", input),
  removeWorkspaceSchedule: (id: string): Promise<AgentSchedule[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceSchedule", id),
  setWorkspaceScheduleEnabled: (
    id: string,
    enabled: boolean,
  ): Promise<AgentSchedule[]> =>
    ipcRenderer.invoke("platform:setWorkspaceScheduleEnabled", id, enabled),
  triggerWorkspaceSchedule: (
    id: string,
    contextOverride?: AgentDispatchContextOverride | null,
  ): Promise<AgentSchedule[]> =>
    ipcRenderer.invoke("platform:triggerWorkspaceSchedule", id, contextOverride),
  listWorkspaceDispatchRuns: (): Promise<AgentDispatchRun[]> =>
    ipcRenderer.invoke("platform:listWorkspaceDispatchRuns"),
  dispatchWorkspaceProfile: (
    profileName: string,
    contextOverride?: AgentDispatchContextOverride | null,
  ): Promise<AgentDispatchRun | null> =>
    ipcRenderer.invoke("platform:dispatchWorkspaceProfile", profileName, contextOverride),
  subscribeWorkspaceDispatchRuns: (
    listener: (runtimeProviderId: PlatformRuntimeProviderId) => void,
  ): (() => void) => {
    const handler = (
      _event: unknown,
      payload: { runtimeProviderId: PlatformRuntimeProviderId },
    ) => {
      listener(payload.runtimeProviderId);
    };

    ipcRenderer.on("platform:workspaceDispatchRunsUpdated", handler);

    return () => {
      ipcRenderer.removeListener("platform:workspaceDispatchRunsUpdated", handler);
    };
  },
  listWorkspaceCodeGraphRepos: (): Promise<CodeGraphRepoSummary[]> =>
    ipcRenderer.invoke("platform:listWorkspaceCodeGraphRepos"),
  saveWorkspaceCodeGraphRepo: (
    input: WorkspaceCodeGraphRepoInput,
  ): Promise<CodeGraphRepoSummary[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceCodeGraphRepo", input),
  removeWorkspaceCodeGraphRepo: (id: string): Promise<CodeGraphRepoSummary[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceCodeGraphRepo", id),
  setCurrentWorkspaceCodeGraphRepo: (id: string): Promise<CodeGraphRepoSummary[]> =>
    ipcRenderer.invoke("platform:setCurrentWorkspaceCodeGraphRepo", id),
  initializeWorkspaceCodeGraphRepo: (id: string): Promise<CodeGraphRepoSummary[]> =>
    ipcRenderer.invoke("platform:initializeWorkspaceCodeGraphRepo", id),
  syncWorkspaceCodeGraphRepo: (id: string): Promise<CodeGraphRepoSummary[]> =>
    ipcRenderer.invoke("platform:syncWorkspaceCodeGraphRepo", id),
  listWorkspaceCodeGraphEntrypoints: (): Promise<CodeGraphEntrypoint[]> =>
    ipcRenderer.invoke("platform:listWorkspaceCodeGraphEntrypoints"),
  saveWorkspaceCodeGraphEntrypoint: (
    input: WorkspaceCodeGraphEntrypointInput,
  ): Promise<CodeGraphEntrypoint[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceCodeGraphEntrypoint", input),
  removeWorkspaceCodeGraphEntrypoint: (id: string): Promise<CodeGraphEntrypoint[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceCodeGraphEntrypoint", id),
  listWorkspaceCodeGraphQueries: (): Promise<CodeGraphQueryTemplate[]> =>
    ipcRenderer.invoke("platform:listWorkspaceCodeGraphQueries"),
  saveWorkspaceCodeGraphQuery: (
    input: WorkspaceCodeGraphQueryInput,
  ): Promise<CodeGraphQueryTemplate[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceCodeGraphQuery", input),
  removeWorkspaceCodeGraphQuery: (id: string): Promise<CodeGraphQueryTemplate[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceCodeGraphQuery", id),
  listWorkspaceEverOsHarnesses: (): Promise<EverOsHarness[]> =>
    ipcRenderer.invoke("platform:listWorkspaceEverOsHarnesses"),
  saveWorkspaceEverOsHarness: (
    input: WorkspaceEverOsHarnessInput,
  ): Promise<EverOsHarness[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceEverOsHarness", input),
  removeWorkspaceEverOsHarness: (id: string): Promise<EverOsHarness[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceEverOsHarness", id),
  setWorkspaceEverOsHarnessEnabled: (
    id: string,
    enabled: boolean,
  ): Promise<EverOsHarness[]> =>
    ipcRenderer.invoke("platform:setWorkspaceEverOsHarnessEnabled", id, enabled),
  listWorkspaceKanbanBoards: (): Promise<KanbanBoard[]> =>
    ipcRenderer.invoke("platform:listWorkspaceKanbanBoards"),
  saveWorkspaceKanbanBoard: (
    input: WorkspaceKanbanBoardInput,
  ): Promise<KanbanBoard[]> =>
    ipcRenderer.invoke("platform:saveWorkspaceKanbanBoard", input),
  removeWorkspaceKanbanBoard: (slug: string): Promise<KanbanBoard[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceKanbanBoard", slug),
  setCurrentWorkspaceKanbanBoard: (boardSlug: string): Promise<KanbanBoard[]> =>
    ipcRenderer.invoke("platform:setCurrentWorkspaceKanbanBoard", boardSlug),
  listWorkspaceKanbanTasks: (boardSlug?: string | null): Promise<KanbanTask[]> =>
    ipcRenderer.invoke("platform:listWorkspaceKanbanTasks", boardSlug),
  saveWorkspaceKanbanTask: (
    input: WorkspaceKanbanTaskInput,
  ): Promise<KanbanTask[]> => ipcRenderer.invoke("platform:saveWorkspaceKanbanTask", input),
  removeWorkspaceKanbanTask: (
    id: string,
    boardSlug?: string | null,
  ): Promise<KanbanTask[]> =>
    ipcRenderer.invoke("platform:removeWorkspaceKanbanTask", id, boardSlug),
};

contextBridge.exposeInMainWorld("platformAPI", platformAPI);
