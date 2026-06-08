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
  PlatformRuntimeSurfacePatch,
  PlatformServiceTier,
  PlatformSmokeTargetPatch,
  PlatformTaskOrchestratorId,
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

export {};

declare global {
  interface Window {
    platformAPI: {
      getOverview(): Promise<PlatformOverview>;
      refreshDockerNodes(): Promise<PlatformOverview>;
      onboardDockerNodeAsCustomApp(
        input: PlatformCustomAppOnboardingInput,
      ): Promise<PlatformOverview>;
      setDockerNodeBinding(
        nodeKey: string,
        appId: string | null,
      ): Promise<PlatformOverview>;
      setAppEnabled(appId: string, enabled: boolean): Promise<PlatformOverview>;
      setActiveView(view: PlatformView): Promise<PlatformOverview>;
      setActiveRuntimeProvider(
        runtimeProviderId: PlatformRuntimeProviderId,
      ): Promise<PlatformOverview>;
      setActiveTaskOrchestrator(
        taskOrchestratorId: PlatformTaskOrchestratorId,
      ): Promise<PlatformOverview>;
      setMissionCardStage(
        cardId: string,
        stage: PlatformMissionStage,
      ): Promise<PlatformOverview>;
      toggleMissionChecklistItem(
        cardId: string,
        checklistItemId: string,
      ): Promise<PlatformOverview>;
      setMissionCardServiceTier(
        cardId: string,
        serviceTier: PlatformServiceTier,
      ): Promise<PlatformOverview>;
      setRuntimeSurfaceConfig(
        appId: string,
        patch: PlatformRuntimeSurfacePatch,
      ): Promise<PlatformOverview>;
      setSmokeTargetConfig(
        targetId: string,
        patch: PlatformSmokeTargetPatch,
      ): Promise<PlatformOverview>;
      runSmokeTarget(targetId: string): Promise<PlatformOverview>;
      openRuntimeSurface(appId: string): Promise<boolean>;
      openHermesGatewayLog(): Promise<string | null>;
      getHermesRuntimeLifecycle(): Promise<HermesRuntimeLifecycleSummary>;
      verifyHermesRuntime(): Promise<HermesRuntimeLifecycleSummary>;
      installHermesRuntime(): Promise<HermesRuntimeLifecycleSummary>;
      repairHermesRuntime(): Promise<HermesRuntimeLifecycleSummary>;
      updateHermesRuntime(): Promise<HermesRuntimeLifecycleSummary>;
      runHermesDoctor(): Promise<HermesRuntimeLifecycleSummary>;
      startHermesGateway(): Promise<HermesRuntimeLifecycleSummary>;
      stopHermesGateway(): Promise<HermesRuntimeLifecycleSummary>;
      adoptHermesHome(): Promise<HermesRuntimeLifecycleSummary>;
      resetHermesHomeAdoption(): Promise<HermesRuntimeLifecycleSummary>;
      subscribeHermesRuntimeLifecycle(
        listener: (summary: HermesRuntimeLifecycleSummary) => void,
      ): () => void;
      listAgentSessions(): Promise<AgentChatSession[]>;
      getAgentSessionHistory(
        sessionId: string,
      ): Promise<AgentSessionHistoryItem[]>;
      saveAgentSessionSnapshot(input: WorkspaceSessionSnapshotInput): Promise<{
        sessionId: string;
        sessions: AgentChatSession[];
      }>;
      updateAgentSessionTitle(
        sessionId: string,
        title: string,
      ): Promise<AgentChatSession[]>;
      deleteAgentSession(sessionId: string): Promise<AgentChatSession[]>;
      readSoul(): Promise<string>;
      writeSoul(content: string): Promise<boolean>;
      resetSoul(): Promise<string>;
      listWorkspaceProfiles(): Promise<AgentProfile[]>;
      saveWorkspaceProfile(input: WorkspaceProfileInput): Promise<AgentProfile[]>;
      removeWorkspaceProfile(name: string): Promise<AgentProfile[]>;
      listWorkspaceModels(): Promise<AgentModelEndpoint[]>;
      saveWorkspaceModel(input: WorkspaceModelInput): Promise<AgentModelEndpoint[]>;
      removeWorkspaceModel(id: string): Promise<AgentModelEndpoint[]>;
      listWorkspaceProviders(): Promise<AgentProviderConfig[]>;
      discoverProviderModels(
        providerType: string,
        baseUrl?: string,
        apiKey?: string,
      ): Promise<AgentProviderDiscoveryResult>;
      saveWorkspaceProvider(
        input: WorkspaceProviderInput,
      ): Promise<AgentProviderConfig[]>;
      removeWorkspaceProvider(id: string): Promise<AgentProviderConfig[]>;
      listWorkspaceSkills(): Promise<AgentSkill[]>;
      saveWorkspaceSkill(input: WorkspaceSkillInput): Promise<AgentSkill[]>;
      removeWorkspaceSkill(name: string): Promise<AgentSkill[]>;
      listWorkspaceMemory(): Promise<AgentMemoryEntry[]>;
      saveWorkspaceMemoryEntry(
        input: WorkspaceMemoryInput,
      ): Promise<AgentMemoryEntry[]>;
      removeWorkspaceMemoryEntry(id: string): Promise<AgentMemoryEntry[]>;
      listWorkspaceTools(): Promise<AgentTool[]>;
      saveWorkspaceTool(input: WorkspaceToolInput): Promise<AgentTool[]>;
      removeWorkspaceTool(name: string): Promise<AgentTool[]>;
      setWorkspaceToolEnabled(name: string, enabled: boolean): Promise<AgentTool[]>;
      listWorkspaceSchedules(): Promise<AgentSchedule[]>;
      saveWorkspaceSchedule(
        input: WorkspaceScheduleInput,
      ): Promise<AgentSchedule[]>;
      removeWorkspaceSchedule(id: string): Promise<AgentSchedule[]>;
      setWorkspaceScheduleEnabled(
        id: string,
        enabled: boolean,
      ): Promise<AgentSchedule[]>;
      triggerWorkspaceSchedule(
        id: string,
        contextOverride?: AgentDispatchContextOverride | null,
      ): Promise<AgentSchedule[]>;
      listWorkspaceDispatchRuns(): Promise<AgentDispatchRun[]>;
      dispatchWorkspaceProfile(
        profileName: string,
        contextOverride?: AgentDispatchContextOverride | null,
      ): Promise<AgentDispatchRun | null>;
      subscribeWorkspaceDispatchRuns(
        listener: (runtimeProviderId: PlatformRuntimeProviderId) => void,
      ): () => void;
      listWorkspaceCodeGraphRepos(): Promise<CodeGraphRepoSummary[]>;
      saveWorkspaceCodeGraphRepo(
        input: WorkspaceCodeGraphRepoInput,
      ): Promise<CodeGraphRepoSummary[]>;
      removeWorkspaceCodeGraphRepo(id: string): Promise<CodeGraphRepoSummary[]>;
      setCurrentWorkspaceCodeGraphRepo(id: string): Promise<CodeGraphRepoSummary[]>;
      initializeWorkspaceCodeGraphRepo(id: string): Promise<CodeGraphRepoSummary[]>;
      syncWorkspaceCodeGraphRepo(id: string): Promise<CodeGraphRepoSummary[]>;
      listWorkspaceCodeGraphEntrypoints(): Promise<CodeGraphEntrypoint[]>;
      saveWorkspaceCodeGraphEntrypoint(
        input: WorkspaceCodeGraphEntrypointInput,
      ): Promise<CodeGraphEntrypoint[]>;
      removeWorkspaceCodeGraphEntrypoint(id: string): Promise<CodeGraphEntrypoint[]>;
      listWorkspaceCodeGraphQueries(): Promise<CodeGraphQueryTemplate[]>;
      saveWorkspaceCodeGraphQuery(
        input: WorkspaceCodeGraphQueryInput,
      ): Promise<CodeGraphQueryTemplate[]>;
      removeWorkspaceCodeGraphQuery(id: string): Promise<CodeGraphQueryTemplate[]>;
      listWorkspaceEverOsHarnesses(): Promise<EverOsHarness[]>;
      saveWorkspaceEverOsHarness(
        input: WorkspaceEverOsHarnessInput,
      ): Promise<EverOsHarness[]>;
      removeWorkspaceEverOsHarness(id: string): Promise<EverOsHarness[]>;
      setWorkspaceEverOsHarnessEnabled(
        id: string,
        enabled: boolean,
      ): Promise<EverOsHarness[]>;
      listWorkspaceKanbanBoards(): Promise<KanbanBoard[]>;
      saveWorkspaceKanbanBoard(input: WorkspaceKanbanBoardInput): Promise<KanbanBoard[]>;
      removeWorkspaceKanbanBoard(slug: string): Promise<KanbanBoard[]>;
      setCurrentWorkspaceKanbanBoard(boardSlug: string): Promise<KanbanBoard[]>;
      listWorkspaceKanbanTasks(boardSlug?: string | null): Promise<KanbanTask[]>;
      saveWorkspaceKanbanTask(input: WorkspaceKanbanTaskInput): Promise<KanbanTask[]>;
      removeWorkspaceKanbanTask(
        id: string,
        boardSlug?: string | null,
      ): Promise<KanbanTask[]>;
    };
  }
}
