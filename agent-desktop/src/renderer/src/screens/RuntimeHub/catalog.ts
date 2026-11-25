import {
  Bot,
  BookOpen,
  Boxes,
  Brain,
  CircuitBoard,
  Database,
  Folder,
  KeyRound,
  Layers,
  ListTree,
  Radio,
  Gauge,
  Sparkles,
  Users,
  Wrench,
  Clock,
  TerminalSquare,
  Cable,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the capability panes behind the Runtime rail
 * entry. The hub screen renders these as cards; the rail renders them as
 * pinned items when the operator pins them. Keeping both consumers on one
 * catalog is what guarantees a pinned rail icon matches the hub card.
 */

export type RuntimePane =
  | "agents"
  | "soul"
  | "skills"
  | "tools"
  | "mcp"
  | "models"
  | "providers"
  | "memory"
  | "codegraph"
  | "everos"
  | "headroom"
  | "knowledge"
  | "workspace"
  | "workspaceConsole"
  | "swarm"
  | "sandboxtasks"
  | "schedules"
  | "gateway";

export interface RuntimeCard {
  view: RuntimePane;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  /** Shell command that installs the tool, shown with a copy button. */
  installCommand?: string;
  /** True when the tool needs an API key before it is useful. */
  needsApiKey?: boolean;
}

export interface RuntimeGroup {
  labelKey: string;
  cards: RuntimeCard[];
}

export const RUNTIME_GROUPS: RuntimeGroup[] = [
  {
    labelKey: "groupAgent",
    cards: [
      { view: "agents", icon: Bot, titleKey: "agents", descKey: "agentsDesc" },
      { view: "soul", icon: Sparkles, titleKey: "soul", descKey: "soulDesc" },
      { view: "skills", icon: ListTree, titleKey: "skills", descKey: "skillsDesc" },
    ],
  },
  {
    labelKey: "groupTools",
    cards: [
      { view: "tools", icon: Wrench, titleKey: "tools", descKey: "toolsDesc" },
      { view: "mcp", icon: Cable, titleKey: "mcp", descKey: "mcpDesc" },
      { view: "models", icon: Layers, titleKey: "models", descKey: "modelsDesc" },
      { view: "providers", icon: KeyRound, titleKey: "providers", descKey: "providersDesc" },
    ],
  },
  {
    labelKey: "groupKnowledge",
    cards: [
      { view: "memory", icon: Brain, titleKey: "memory", descKey: "memoryDesc" },
      {
        view: "codegraph",
        icon: CircuitBoard,
        titleKey: "codegraph",
        descKey: "codegraphDesc",
        installCommand: "npm install -g @colbymchenry/codegraph",
      },
      {
        view: "everos",
        icon: Database,
        titleKey: "everos",
        descKey: "everosDesc",
        installCommand: "python -m pip install --user everos",
      },
      {
        view: "headroom",
        icon: Gauge,
        titleKey: "headroom",
        descKey: "headroomDesc",
        installCommand: 'python -m pip install --user "headroom-ai[all]"',
      },
      { view: "knowledge", icon: BookOpen, titleKey: "knowledge", descKey: "knowledgeDesc" },
    ],
  },
  {
    labelKey: "groupWorkspace",
    cards: [
      { view: "workspace", icon: Folder, titleKey: "workspace", descKey: "workspaceDesc" },
      {
        view: "workspaceConsole",
        icon: TerminalSquare,
        titleKey: "workspaceConsole",
        descKey: "workspaceConsoleDesc",
      },
      { view: "swarm", icon: Users, titleKey: "swarm", descKey: "swarmDesc" },
      {
        view: "sandboxtasks",
        icon: Boxes,
        titleKey: "sandboxtasks",
        descKey: "sandboxtasksDesc",
      },
      {
        view: "schedules",
        icon: Clock,
        titleKey: "schedules",
        descKey: "schedulesDesc",
      },
      { view: "gateway", icon: Radio, titleKey: "gateway", descKey: "gatewayDesc" },
    ],
  },
];

export const RUNTIME_CARDS: RuntimeCard[] = RUNTIME_GROUPS.flatMap(
  (group) => group.cards,
);

export const RUNTIME_CARD_BY_VIEW = new Map<RuntimePane, RuntimeCard>(
  RUNTIME_CARDS.map((card) => [card.view, card]),
);

/** Maximum number of capability shortcuts the rail will carry at once. */
export const MAX_RAIL_PINS = 4;

export function isRuntimePane(value: unknown): value is RuntimePane {
  return typeof value === "string" && RUNTIME_CARD_BY_VIEW.has(value as RuntimePane);
}
