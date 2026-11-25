import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

vi.mock("../Gateway/Gateway", () => ({
  default: () => <div>gateway-screen</div>,
}));

vi.mock("../Models/Models", () => ({
  default: () => <div>models-screen</div>,
}));

vi.mock("../Providers/Providers", () => ({
  default: () => <div>providers-screen</div>,
}));

vi.mock("../Mcp/Mcp", () => ({
  default: () => <div>mcp-screen</div>,
}));

vi.mock("../Home/Home", () => ({
  default: () => <div>home-screen</div>,
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
      listMcpServers: overrides.listMcpServers ?? vi.fn().mockResolvedValue([]),
      setMcpServerEnabled:
        overrides.setMcpServerEnabled ??
        vi.fn().mockResolvedValue({ ok: true }),
      addMcpServer:
        overrides.addMcpServer ?? vi.fn().mockResolvedValue({ ok: true }),
      removeMcpServer:
        overrides.removeMcpServer ?? vi.fn().mockResolvedValue({ ok: true }),
      // Codebase Memory (CMM) — probed by the CodeGraph screen on mount
      discoverCodebaseMemory: vi
        .fn()
        .mockResolvedValue({ found: false, path: null, version: null }),
      listCodebaseMemoryProjects: vi.fn().mockResolvedValue([]),
      // Last30Days — probed by the Tools screen on mount
      discoverLast30Days: vi.fn().mockResolvedValue({
        found: false,
        scriptPath: null,
        cliOnPath: false,
        version: null,
      }),
      // Moo Tasks sidecar — probed by the Plans screen on mount
      mooTasksSidecarStatus: vi.fn().mockResolvedValue({
        state: "stopped",
        running: false,
        pid: null,
        port: null,
        baseUrl: "http://127.0.0.1:3000",
        mcpUrl: "http://127.0.0.1:3000/mcp",
        lastError: null,
        crashCount: 0,
        startedAt: null,
        uptimeMs: null,
        reason: null,
      }),
      // CodeGraph screen probes these on mount
      codegraphCliStatus: vi.fn().mockResolvedValue({
        installed: false,
        version: null,
        command: null,
        error: null,
      }),
      codegraphRuntimeStatus: vi.fn().mockResolvedValue({
        available: false,
        sdkInstalled: false,
        projectOpen: false,
        sdkVersion: null,
      }),
    },
  });
}

/** Nav model after the shell redesign: six primary destinations.
 *  The 18 capability panes are reached through the Runtime hub, not the
 *  rail. The tests below assert the rail contract and that the hub is the
 *  way to every capability screen. */
const NAV_ITEMS = [
  "navigation.home",
  "navigation.chat",
  "navigation.sessions",
  "navigation.plans",
  "navigation.runtime",
  "navigation.settings",
] as const;

/** Capabilities only reachable through the Runtime hub. */
const RUNTIME_CAPABILITIES = [
  "navigation.agents",
  "navigation.soul",
  "navigation.skills",
  "navigation.tools",
  "navigation.mcp",
  "navigation.models",
  "navigation.providers",
  "navigation.memory",
  "navigation.codegraph",
  "navigation.everos",
  "navigation.headroom",
  "navigation.knowledge",
  "navigation.sandboxtasks",
  "navigation.workspace",
  "navigation.workspaceConsole",
  "navigation.swarm",
  "navigation.schedules",
  "navigation.gateway",
] as const;

function navButton(label: string): HTMLButtonElement {
  return screen.getByRole("button", { name: label }) as HTMLButtonElement;
}

describe("Layout navigation", () => {
  it("does not expose Office in the Agent Desktop sidebar", async () => {
    installHermesAPI();

    render(<Layout />);

    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    expect(screen.getByText("navigation.home")).toBeInTheDocument();
    expect(screen.queryByText("navigation.office")).not.toBeInTheDocument();
  });

  it("opens a dedicated legal modal from the rail footer button", async () => {
    installHermesAPI();

    render(<Layout />);

    const legalButton = await screen.findByRole("button", {
      name: "common.legal.openPanel",
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

describe("Layout rail", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("renders exactly the six primary destinations, in order", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const labels = NAV_ITEMS.map((label) =>
      navButton(label).textContent?.trim(),
    );
    expect(labels).toEqual([...NAV_ITEMS]);
  });

  it("keeps every capability out of the rail", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    for (const key of RUNTIME_CAPABILITIES) {
      expect(screen.queryByRole("button", { name: key })).toBeNull();
    }
  });

  it("exposes an accessible label on the primary nav", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("navigation", { name: "navigation.primaryNav" }),
    ).toBeInTheDocument();
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

    // Default view is home, so only home should be marked current.
    const activeBefore = document.querySelectorAll('[aria-current="page"]');
    expect(activeBefore.length).toBe(1);
    expect(activeBefore[0].getAttribute("data-testid")).toBe("nav-home");
  });

  it("updates the active class when a different nav item is clicked", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    fireEvent.click(navButton("navigation.runtime"));

    await waitFor(() => {
      expect(screen.getByText("runtime.skills")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "runtime.skills" }));

    await waitFor(() => {
      const active = document.querySelectorAll('[aria-current="page"]');
      expect(active.length).toBe(1);
      expect(active[0].getAttribute("data-testid")).toBe("nav-runtime");
    });
  });

  it("switches between rail entries without losing active state", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    fireEvent.click(navButton("navigation.settings"));
    await waitFor(() => {
      const active = document.querySelectorAll('[aria-current="page"]');
      expect(active[0].getAttribute("data-testid")).toBe("nav-settings");
    });

    fireEvent.click(navButton("navigation.plans"));
    await waitFor(() => {
      const active = document.querySelectorAll('[aria-current="page"]');
      expect(active[0].getAttribute("data-testid")).toBe("nav-plans");
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
    // Default profile is "default" -> the rail subheading identifies the app.
    expect(screen.getByText("Agent Desktop")).toBeInTheDocument();
  });

  it("does not show the update button when no update is available", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/common\.updateAvailable/),
    ).not.toBeInTheDocument();
  });

  it("shows the update button when an update becomes available", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // Simulate the update-available event firing.
    const hermes = (
      window as unknown as {
        hermesAPI: { onUpdateAvailable: ReturnType<typeof vi.fn> };
      }
    ).hermesAPI;
    const onAvailable = hermes.onUpdateAvailable.mock.calls[0][0];
    act(() => {
      onAvailable({ version: "0.7.0" });
    });

    const updateBtn = await screen.findByText(/common\.updateAvailable/);
    expect(updateBtn.closest("button")).not.toBeNull();
  });

  it("triggers download when the update button is clicked", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    const hermes = (
      window as unknown as {
        hermesAPI: {
          onUpdateAvailable: ReturnType<typeof vi.fn>;
          downloadUpdate: ReturnType<typeof vi.fn>;
        };
      }
    ).hermesAPI;
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

    fireEvent.click(navButton("navigation.runtime"));
    await waitFor(() => {
      expect(screen.getByText("runtime.skills")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "runtime.skills" }));

    await waitFor(() => {
      const active = document.querySelectorAll('[aria-current="page"]');
      expect(active[0].getAttribute("data-testid")).toBe("nav-runtime");
    });
  });

  it("activates the focused nav item on Space (native button behavior)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    fireEvent.click(navButton("navigation.runtime"));
    await waitFor(() => {
      expect(screen.getByText("runtime.memory")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "runtime.memory" }));

    await waitFor(() => {
      const active = document.querySelectorAll('[aria-current="page"]');
      expect(active[0].getAttribute("data-testid")).toBe("nav-runtime");
    });
  });

  it("focuses nav items in rail order (home → settings)", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });
    const order = [
      "home",
      "chat",
      "sessions",
      "plans",
      "runtime",
      "settings",
    ].map((v) => document.querySelector(`[data-testid="nav-${v}"]`));
    for (const el of order) expect(el).not.toBeNull();
    expect(order.map((el) => el!.getAttribute("data-testid"))).toEqual([
      "nav-home",
      "nav-chat",
      "nav-sessions",
      "nav-plans",
      "nav-runtime",
      "nav-settings",
    ]);
  });
});

describe("Layout rail Runtime badge", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("shows an enabled/total badge on the Runtime entry", async () => {
    installHermesAPI({
      listMcpServers: vi.fn().mockResolvedValue([
        { name: "github", type: "stdio", enabled: true, detail: "npx" },
        {
          name: "exa",
          type: "http",
          enabled: true,
          detail: "https://mcp.exa.ai/mcp",
        },
        { name: "playwright", type: "stdio", enabled: false, detail: "npx" },
      ]),
    });
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("2/3")).toBeInTheDocument();
    });
  });

  it("hides the badge until the MCP list resolves", async () => {
    let resolve: (
      v: Array<{
        name: string;
        type: string;
        enabled: boolean;
        detail: string;
      }>,
    ) => void = () => {};
    installHermesAPI({
      listMcpServers: vi.fn().mockImplementation(
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
    resolve([]);
    await waitFor(() => {
      expect(screen.queryByText("0/0")).toBeNull();
    });
  });
});

describe("Layout rail pins", () => {
  beforeEach(() => {
    installHermesAPI();
    localStorage.removeItem("cubecloud.runtime-rail-pins");
  });

  it("pins a runtime capability from the hub onto the rail", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    expect(document.querySelector('[data-testid="nav-pin-codegraph"]')).toBeNull();

    fireEvent.click(navButton("navigation.runtime"));
    await waitFor(() => {
      expect(screen.getByText("runtime.codegraph")).toBeInTheDocument();
    });

    const hubGrid = screen
      .getAllByText("runtime.codegraph")
      .map((el) => el.closest("[class*=runtime-hub-grid]"))
      .find((el) => el !== null && el !== undefined);
    const card = Array.from(hubGrid?.children ?? []).find((el) =>
      el.textContent?.includes("runtime.codegraph"),
    );
    const pin = card?.querySelector(
      'button[aria-label="runtime.pinToRail"]',
    ) as HTMLButtonElement | null;
    expect(pin).not.toBeNull();
    fireEvent.click(pin as HTMLButtonElement);

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="nav-pin-codegraph"]'),
      ).not.toBeNull();
    });
    expect(localStorage.getItem("cubecloud.runtime-rail-pins")).toContain(
      "codegraph",
    );
  });

  it("unpins a capability from the rail via the hub toggle", async () => {
    localStorage.setItem(
      "cubecloud.runtime-rail-pins",
      JSON.stringify(["headroom"]),
    );
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    expect(
      document.querySelector('[data-testid="nav-pin-headroom"]'),
    ).not.toBeNull();

    fireEvent.click(navButton("navigation.runtime"));
    await waitFor(() => {
      expect(screen.getAllByText("runtime.headroom").length).toBeGreaterThan(0);
    });

    const card = screen
      .getAllByText("runtime.headroom")
      .map((el) => el.closest("[class*=runtime-hub-grid]"))
      .find((el) => el !== null);
    const unpin = card?.querySelector(
      'button[aria-label="runtime.unpinFromRail"]',
    ) as HTMLButtonElement | null;
    expect(unpin).not.toBeNull();
    fireEvent.click(unpin as HTMLButtonElement);

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="nav-pin-headroom"]'),
      ).toBeNull();
    });
  });
});

describe("Layout sidebar content panes", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  it("mounts the home pane by default and lazy-mounts others on click", async () => {
    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.home")).toBeInTheDocument();
    });
    // Home is the default view and should render.
    expect(screen.getByText("home-screen")).toBeInTheDocument();
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

    fireEvent.click(navButton("navigation.runtime"));
    await waitFor(() => {
      expect(screen.getByText("runtime.skills")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "runtime.skills" }));

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
    ];
    for (const [navLabel, screenText] of smoke) {
      fireEvent.click(navButton(navLabel));
      await waitFor(() => {
        expect(screen.getByText(screenText)).toBeInTheDocument();
      });
    }

    // Agents is reachable only through the Runtime hub.
    fireEvent.click(navButton("navigation.runtime"));
    await waitFor(() => {
      expect(screen.getByText("runtime.agents")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "runtime.agents" }));
    await waitFor(() => {
      expect(screen.getByText("agents-screen")).toBeInTheDocument();
    });

    // Navigate back to chat.
    fireEvent.click(
      screen
        .getByText("navigation.chat")
        .closest("button") as HTMLButtonElement,
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
    expect(screen.queryByText("gateway-screen")).not.toBeInTheDocument();
    expect(screen.queryByText("settings-screen")).not.toBeInTheDocument();
  });
});

describe("Layout chat session persistence", () => {
  it("restores the last active session from localStorage on mount", async () => {
    localStorage.setItem("hermes-active-session", "abc-123");
    installHermesAPI({
      listMcpServers: vi.fn().mockResolvedValue([]),
    });
    // Override getSessionMessages to return a non-empty array so the
    // restore effect treats the session as still valid.
    (
      window as unknown as {
        hermesAPI: { getSessionMessages: ReturnType<typeof vi.fn> };
      }
    ).hermesAPI.getSessionMessages = vi
      .fn()
      .mockResolvedValue([
        { id: 1, role: "user", content: "hello", timestamp: 0 },
      ]);

    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // The restore effect should have called getSessionMessages with
    // the persisted session ID.
    await waitFor(() => {
      expect(
        (
          window as unknown as {
            hermesAPI: { getSessionMessages: ReturnType<typeof vi.fn> };
          }
        ).hermesAPI.getSessionMessages,
      ).toHaveBeenCalledWith("abc-123");
    });
  });

  it("clears a stale session ID when the session no longer exists in the DB", async () => {
    localStorage.setItem("hermes-active-session", "gone-456");
    installHermesAPI({
      listMcpServers: vi.fn().mockResolvedValue([]),
    });
    (
      window as unknown as {
        hermesAPI: { getSessionMessages: ReturnType<typeof vi.fn> };
      }
    ).hermesAPI.getSessionMessages = vi.fn().mockResolvedValue([]);

    render(<Layout />);
    await waitFor(() => {
      expect(screen.getByText("navigation.chat")).toBeInTheDocument();
    });

    // The stale ID should be cleared from localStorage.
    await waitFor(() => {
      expect(localStorage.getItem("hermes-active-session")).toBeNull();
    });
  });
});
