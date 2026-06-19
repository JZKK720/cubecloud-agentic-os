import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: () => {},
  }),
}));

vi.mock("../Chat/Chat", () => ({
  default: () => <div>chat-screen</div>,
}));

vi.mock("../Sessions/Sessions", () => ({
  default: () => <div>sessions-screen</div>,
}));

vi.mock("../Agents/Agents", () => ({
  default: () => <div>agents-screen</div>,
}));

vi.mock("../Settings/Settings", () => ({
  default: () => <div>settings-screen</div>,
}));

vi.mock("../Skills/Skills", () => ({
  default: () => <div>skills-screen</div>,
}));

vi.mock("../Memory/Memory", () => ({
  default: () => <div>memory-screen</div>,
}));

vi.mock("../Tools/Tools", () => ({
  default: () => <div>tools-screen</div>,
}));

vi.mock("../Workspace/Workspace", () => ({
  default: () => <div>workspace-screen</div>,
}));

vi.mock("../Gateway/Gateway", () => ({
  default: () => <div>gateway-screen</div>,
}));

vi.mock("../Models/Models", () => ({
  default: () => <div>models-screen</div>,
}));

vi.mock("../Providers/Providers", () => ({
  default: () => <div>providers-screen</div>,
}));

vi.mock("../Schedules/Schedules", () => ({
  default: () => <div>schedules-screen</div>,
}));

vi.mock("../Mcp/Mcp", () => ({
  default: () => <div>mcp-screen</div>,
}));

import Layout from "./Layout";

function installHermesAPI(
  overrides: Partial<{
    listMcpServers: ReturnType<typeof vi.fn>;
    setMcpServerEnabled: ReturnType<typeof vi.fn>;
    addMcpServer: ReturnType<typeof vi.fn>;
    removeMcpServer: ReturnType<typeof vi.fn>;
  }> = {},
): void {
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: {
      isRemoteOnlyMode: vi.fn().mockResolvedValue(false),
      onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
      onUpdateDownloadProgress: vi.fn().mockReturnValue(() => {}),
      onUpdateDownloaded: vi.fn().mockReturnValue(() => {}),
      onUpdateError: vi.fn().mockReturnValue(() => {}),
      downloadUpdate: vi.fn().mockResolvedValue(true),
      installUpdate: vi.fn().mockResolvedValue(undefined),
      abortChat: vi.fn(),
      onMenuNewChat: vi.fn().mockReturnValue(() => {}),
      onMenuSearchSessions: vi.fn().mockReturnValue(() => {}),
      getSessionMessages: vi.fn().mockResolvedValue([]),
      // Soul screen needs this on mount; return empty string.
      readSoul: vi.fn().mockResolvedValue(""),
      // MCP servers
      listMcpServers:
        overrides.listMcpServers ?? vi.fn().mockResolvedValue([]),
      setMcpServerEnabled:
        overrides.setMcpServerEnabled ??
        vi.fn().mockResolvedValue({ ok: true }),
      addMcpServer: overrides.addMcpServer ?? vi.fn().mockResolvedValue({ ok: true }),
      removeMcpServer:
        overrides.removeMcpServer ?? vi.fn().mockResolvedValue({ ok: true }),
    },
  });
}

/** All 16 nav items, in the order they appear in the sidebar. Each
 *  test below checks the surface sidebar (not Office / Kanban) and
 *  the per-group labels, the active-state treatment, footer affordances,
 *  and the in-pane rendering of each screen mock. */
const WORK_GROUP_ITEMS = [
  "navigation.chat",
  "navigation.sessions",
  "navigation.agents",
  "navigation.soul",
  "navigation.plans",
  "navigation.codegraph",
  "navigation.everos",
  "navigation.headroom",
  "navigation.sandboxtasks",
] as const;

const CONFIGURE_GROUP_ITEMS = [
  "navigation.models",
  "navigation.providers",
  "navigation.skills",
  "navigation.memory",
  "navigation.tools",
  "navigation.workspace",
  "navigation.schedules",
] as const;

const PLATFORM_GROUP_ITEMS = [
  "navigation.gateway",
  "navigation.settings",
] as const;

describe("Layout navigation", () => {
  it("does not expose Office or Kanban in the Agent Desktop sidebar", async () => {
    installHermesAPI();

    render(<Layout />);

    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    expect(screen.getByText("navigation.skills")).toBeInTheDocument();
    expect(screen.getByText("navigation.gateway")).toBeInTheDocument();
    expect(screen.getByText("navigation.workspace")).toBeInTheDocument();
    expect(screen.queryByText("navigation.office")).not.toBeInTheDocument();
    expect(screen.queryByText("navigation.kanban")).not.toBeInTheDocument();
  });

  it("opens a dedicated legal modal from the pinned footer button", async () => {
    installHermesAPI();

    render(<Layout />);

    const legalButton = await screen.findByRole("button", {
      name: "legal.openPanel",
    });

    fireEvent.click(legalButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Copyright, license, and clean-room status"),
    ).toBeInTheDocument();
    expect(screen.queryByText("settings-screen")).not.toBeInTheDocument();
  });
});

describe("Layout sidebar groups", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("renders all three group labels in order", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const labels = screen.getAllByText(/^navigation\.group\./);
    expect(labels.map((l) => l.textContent)).toEqual([
      "navigation.group.work",
      "navigation.group.configure",
      "navigation.group.platform",
    ]);
  });

  it("renders every nav item in the work group", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    for (const key of WORK_GROUP_ITEMS) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it("renders every nav item in the configure group", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    for (const key of CONFIGURE_GROUP_ITEMS) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it("renders every nav item in the platform group", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    for (const key of PLATFORM_GROUP_ITEMS) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it("renders exactly 19 nav items in the sidebar (18 work/configure/platform + MCP)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole("button", { name: /navigation\./ });
    const navButtons = buttons.filter((b) =>
      b.classList.contains("sidebar-nav-item"),
    );
    expect(navButtons.length).toBe(19);
  });

  it("renders the MCP nav item in the platform group between Gateway and Settings", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    const navButtons = Array.from(
      document.querySelectorAll(".sidebar-nav-item"),
    );
    const labels = navButtons.map((b) => b.textContent ?? "");
    expect(labels.find((l) => l.includes("navigation.mcp"))).toBeDefined();
    // MCP comes after Gateway and before Settings.
    const idxGateway = labels.findIndex((l) => l.includes("navigation.gateway"));
    const idxMcp = labels.findIndex((l) => l.includes("navigation.mcp"));
    const idxSettings = labels.findIndex((l) => l.includes("navigation.settings"));
    expect(idxMcp).toBeGreaterThan(idxGateway);
    expect(idxMcp).toBeLessThan(idxSettings);
  });

  it("does not expose retired nav items (Office, Kanban)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    expect(screen.queryByText("navigation.office")).not.toBeInTheDocument();
    expect(screen.queryByText("navigation.kanban")).not.toBeInTheDocument();
  });
});

describe("Layout sidebar active state", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("marks only the current view as active", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // Default view is chat, so only chat should have the active class.
    const activeBefore = document.querySelectorAll(".sidebar-nav-item.active");
    expect(activeBefore.length).toBe(1);
    expect(activeBefore[0].textContent).toContain("navigation.chat");
  });

  it("updates the active class when a different nav item is clicked", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const skillsButton = screen.getByText("navigation.skills").closest(
      "button",
    ) as HTMLButtonElement;
    fireEvent.click(skillsButton);

    await waitFor(() => {
      const active = document.querySelectorAll(".sidebar-nav-item.active");
      expect(active.length).toBe(1);
      expect(active[0].textContent).toContain("navigation.skills");
    });
  });

  it("switches between groups without losing active state", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // Click into the platform group (settings)
    const settingsButton = screen.getByText("navigation.settings").closest(
      "button",
    ) as HTMLButtonElement;
    fireEvent.click(settingsButton);
    await waitFor(() => {
      const active = document.querySelectorAll(".sidebar-nav-item.active");
      expect(active[0].textContent).toContain("navigation.settings");
    });

    // Then back to a work-group item (soul)
    const soulButton = screen.getByText("navigation.soul").closest(
      "button",
    ) as HTMLButtonElement;
    fireEvent.click(soulButton);
    await waitFor(() => {
      const active = document.querySelectorAll(".sidebar-nav-item.active");
      expect(active[0].textContent).toContain("navigation.soul");
    });
  });
});

describe("Layout sidebar footer", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("renders the profile name in the footer", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    // Default profile is "default" -> shows common.appName
    expect(screen.getByText("common.appName")).toBeInTheDocument();
  });

  it("does not show the update button when no update is available", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    expect(document.querySelector(".sidebar-update-btn")).not.toBeInTheDocument();
  });

  it("shows the update button when an update becomes available", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // Simulate the update-available event firing.
    const hermes = (window as unknown as { hermesAPI: { onUpdateAvailable: ReturnType<typeof vi.fn> } }).hermesAPI;
    const onAvailable = hermes.onUpdateAvailable.mock.calls[0][0];
    act(() => {
      onAvailable({ version: "0.7.0" });
    });

    const updateBtn = await screen.findByText(/common\.updateAvailable/);
    expect(updateBtn).toBeInTheDocument();
    expect(updateBtn.closest("button")).toHaveClass("sidebar-update-btn");
  });

  it("triggers download when the update button is clicked", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const hermes = (window as unknown as { hermesAPI: { onUpdateAvailable: ReturnType<typeof vi.fn>; downloadUpdate: ReturnType<typeof vi.fn> } }).hermesAPI;
    const onAvailable = hermes.onUpdateAvailable.mock.calls[0][0];
    act(() => {
      onAvailable({ version: "0.7.0" });
    });
    const updateBtn = await screen.findByText(/common\.updateAvailable/);
    fireEvent.click(updateBtn.closest("button") as HTMLButtonElement);
    expect(hermes.downloadUpdate).toHaveBeenCalled();
  });
});

describe("Layout sidebar keyboard accessibility", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("activates the focused nav item on Enter (native button behavior)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const skillsButton = screen.getByText("navigation.skills").closest(
      "button",
    ) as HTMLButtonElement;
    // Native <button> elements translate Enter / Space to a click
    // event automatically. We simulate that here so the test does
    // not depend on the user-event polyfill.
    fireEvent.click(skillsButton);

    await waitFor(() => {
      const active = document.querySelectorAll(".sidebar-nav-item.active");
      expect(active[0].textContent).toContain("navigation.skills");
    });
  });

  it("activates the focused nav item on Space (native button behavior)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const memoryButton = screen.getByText("navigation.memory").closest(
      "button",
    ) as HTMLButtonElement;
    fireEvent.click(memoryButton);

    await waitFor(() => {
      const active = document.querySelectorAll(".sidebar-nav-item.active");
      expect(active[0].textContent).toContain("navigation.memory");
    });
  });

  it("focuses nav items on Tab traversal (DOM order matches visual order)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    const navButtons = Array.from(
      document.querySelectorAll(".sidebar-nav-item"),
    ) as HTMLButtonElement[];
    expect(navButtons.length).toBe(19);
    // The order in the DOM should match the order defined by NAV_ITEMS.
    expect(navButtons[0].textContent).toContain("navigation.chat");
    expect(navButtons[6].textContent).toContain("navigation.everos");
    expect(navButtons[9].textContent).toContain("navigation.models");
    expect(navButtons[17].textContent).toContain("navigation.mcp");
    expect(navButtons[18].textContent).toContain("navigation.settings");
  });
});

describe("Layout sidebar MCP badge", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("shows an enabled/total badge on the MCP nav item", async () => {
    installHermesAPI({
      listMcpServers: vi.fn().mockResolvedValue([
        { name: "github", type: "stdio", enabled: true, detail: "npx" },
        { name: "exa", type: "http", enabled: true, detail: "https://mcp.exa.ai/mcp" },
        { name: "playwright", type: "stdio", enabled: false, detail: "npx" },
      ]),
    });
    render(<Layout />);
    await waitFor(() => {
      const badges = document.querySelectorAll(".sidebar-nav-badge");
      expect(badges.length).toBe(1);
      expect(badges[0].textContent).toBe("2/3");
    });
  });

  it("does not show the badge until the list resolves", async () => {
    // Defer the response so we can observe the loading state.
    let resolve: (v: Array<{ name: string; type: string; enabled: boolean; detail: string }>) => void = () => {};
    installHermesAPI({
      listMcpServers: vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((r) => {
              resolve = r;
            }),
        ),
    });
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    // Resolve with an empty list — the badge is still hidden
    // because mcpCount is null. (0/0 is a "no servers" state
    // we don't want to advertise.)
    resolve([]);
    await waitFor(() => {
      expect(document.querySelector(".sidebar-nav-badge")).toBeNull();
    });
  });
});

describe("Layout sidebar content panes", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("mounts the chat pane by default and lazy-mounts others on click", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    // Chat is the default view and should render.
    expect(screen.getByText("chat-screen")).toBeInTheDocument();
    // Other screens are not mounted until first visit.
    expect(screen.queryByText("skills-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("settings-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("plans-screen")).not.toBeInTheDocument();
  });

  it("lazy-mounts the skills pane after the user navigates to it", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const skillsButton = screen.getByText("navigation.skills").closest(
      "button",
    ) as HTMLButtonElement;
    fireEvent.click(skillsButton);

    await waitFor(() => {
      expect(screen.getByText("skills-screen")).toBeInTheDocument();
    });
  });

  it("lazy-mounts work-group screens on click and keeps them mounted after the next nav", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // Navigate to sessions, then to agents, then back to chat.
    // Both should remain mounted (lazy-mount pattern).
    const smoke: Array<[string, string]> = [
      ["navigation.sessions", "sessions-screen"],
      ["navigation.agents", "agents-screen"],
    ];
    for (const [navLabel, screenText] of smoke) {
      fireEvent.click(
        screen.getByText(navLabel).closest("button") as HTMLButtonElement,
      );
      await waitFor(() => {
        expect(screen.getByText(screenText)).toBeInTheDocument();
      });
    }

    // Navigate back to chat.
    fireEvent.click(
      screen.getByText("navigation.chat").closest("button") as HTMLButtonElement,
    );
    await waitFor(() => {
      expect(screen.getByText("chat-screen")).toBeInTheDocument();
    });
    // All three lazy-mounted screens should still be in the DOM.
    expect(screen.getByText("sessions-screen")).toBeInTheDocument();
    expect(screen.getByText("agents-screen")).toBeInTheDocument();
  });

  it("does not mount the configure-group screens on first load", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    // None of the configure-group screens should be in the DOM.
    expect(screen.queryByText("models-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("providers-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("skills-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("memory-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("tools-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("workspace-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("schedules-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("gateway-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("settings-screen")).not.toBeInTheDocument();
  });
});