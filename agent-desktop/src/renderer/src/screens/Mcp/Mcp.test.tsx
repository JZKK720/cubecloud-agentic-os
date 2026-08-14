import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// useI18n needs an I18nProvider; pass-through `t` keeps the test
// focused on the IPC + UI contract.
vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      // react-i18next supports both {{name}} and {name}; we mirror
      // that in the mock so badge strings interpolate correctly.
      return Object.entries(options).reduce((msg, [name, value]) => {
        return msg
          .replaceAll(`{{${name}}}`, String(value))
          .replaceAll(`{${name}}`, String(value));
      }, key);
    },
    locale: "en",
    setLocale: () => {},
  }),
}));

import Mcp from "./Mcp";

function installHermes(overrides: {
  listMcpServers?: ReturnType<typeof vi.fn>;
  setMcpServerEnabled?: ReturnType<typeof vi.fn>;
  addMcpServer?: ReturnType<typeof vi.fn>;
  removeMcpServer?: ReturnType<typeof vi.fn>;
  discoverCodebaseMemory?: ReturnType<typeof vi.fn>;
} = {}): void {
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: {
      listMcpServers:
        overrides.listMcpServers ?? vi.fn().mockResolvedValue([]),
      setMcpServerEnabled:
        overrides.setMcpServerEnabled ?? vi.fn().mockResolvedValue({ ok: true }),
      addMcpServer:
        overrides.addMcpServer ?? vi.fn().mockResolvedValue({ ok: true }),
      removeMcpServer:
        overrides.removeMcpServer ?? vi.fn().mockResolvedValue({ ok: true }),
      discoverCodebaseMemory:
        overrides.discoverCodebaseMemory ??
        vi.fn().mockResolvedValue({ found: false, path: null, version: null }),
    },
  });
}

const SAMPLE_SERVERS = [
  { name: "github", type: "stdio", enabled: true, detail: "npx" },
  {
    name: "exa",
    type: "http",
    enabled: true,
    detail: "https://mcp.exa.ai/mcp",
  },
  { name: "playwright", type: "stdio", enabled: false, detail: "npx" },
];

describe("Mcp screen", () => {
  it("renders an empty state when no servers are configured", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
  });

  it("renders one row per server with name, transport, and status", async () => {
    installHermes({ listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS) });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    expect(screen.getByText("exa")).toBeInTheDocument();
    expect(screen.getByText("playwright")).toBeInTheDocument();
    expect(screen.getByText("https://mcp.exa.ai/mcp")).toBeInTheDocument();
  });

  it("shows the enabled/total badge in the header", async () => {
    installHermes({ listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS) });
    render(<Mcp />);
    // The badge is rendered whenever the list resolves with at least
    // one server. We just check the element exists. The i18n
    // interpolation is exercised by the shared i18n suite, not here.
    await waitFor(() => {
      const badges = document.querySelectorAll(".mcp-badge");
      expect(badges.length).toBe(1);
    });
  });

  it("does not show the badge when the list is empty", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
    expect(document.querySelector(".mcp-badge")).toBeNull();
  });

  it("calls setMcpServerEnabled when a row toggle is clicked", async () => {
    const setMcpServerEnabled = vi.fn().mockResolvedValue({ ok: true });
    installHermes({
      listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS),
      setMcpServerEnabled,
    });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    // The first checkbox is the github toggle (enabled=true).
    const toggles = screen.getAllByRole("checkbox");
    fireEvent.click(toggles[0]);
    await waitFor(() => {
      expect(setMcpServerEnabled).toHaveBeenCalledWith(
        "github",
        false,
        undefined,
      );
    });
  });

  it("rolls back the toggle on error", async () => {
    const setMcpServerEnabled = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "boom" });
    installHermes({
      listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS),
      setMcpServerEnabled,
    });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    const toggles = screen.getAllByRole("checkbox");
    fireEvent.click(toggles[0]);
    // After error, github should still be enabled.
    await waitFor(() => {
      expect(toggles[0]).toBeChecked();
    });
    expect(setMcpServerEnabled).toHaveBeenCalled();
  });

  it("dispatches a mcp:changed window event after a successful toggle", async () => {
    installHermes({
      listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS),
      setMcpServerEnabled: vi.fn().mockResolvedValue({ ok: true }),
    });
    const listener = vi.fn();
    window.addEventListener("mcp:changed", listener);
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    const toggles = screen.getAllByRole("checkbox");
    fireEvent.click(toggles[0]);
    await waitFor(() => {
      expect(listener).toHaveBeenCalled();
    });
    window.removeEventListener("mcp:changed", listener);
  });

  it("opens the add form when the header button is clicked", async () => {
    installHermes({ listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS) });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("mcp.addTitle"));
    await waitFor(() => {
      expect(screen.getByText("mcp.addName")).toBeInTheDocument();
    });
  });

  it("calls addMcpServer with the trimmed form values", async () => {
    const addMcpServer = vi.fn().mockResolvedValue({ ok: true });
    installHermes({
      listMcpServers: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue(SAMPLE_SERVERS),
      addMcpServer,
    });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.addTitle")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("mcp.addTitle"));

    fireEvent.change(screen.getByPlaceholderText("mcp.addNamePlaceholder"), {
      target: { value: "  newServer  " },
    });
    fireEvent.change(screen.getByPlaceholderText("mcp.addDetailPlaceholder"), {
      target: { value: "  https://x.example/mcp  " },
    });
    fireEvent.click(screen.getByText("mcp.addSubmit"));

    await waitFor(() => {
      expect(addMcpServer).toHaveBeenCalledWith(
        {
          name: "newServer",
          type: "http",
          enabled: true,
          detail: "https://x.example/mcp",
        },
        undefined,
      );
    });
  });

  it("rejects an invalid server name with the localized error", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.addTitle")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("mcp.addTitle"));
    fireEvent.change(screen.getByPlaceholderText("mcp.addNamePlaceholder"), {
      target: { value: "bad name!" },
    });
    fireEvent.change(screen.getByPlaceholderText("mcp.addDetailPlaceholder"), {
      target: { value: "https://x.example/mcp" },
    });
    fireEvent.click(screen.getByText("mcp.addSubmit"));
    await waitFor(() => {
      expect(screen.getByText("mcp.addErrorInvalidName")).toBeInTheDocument();
    });
  });

  it("calls removeMcpServer after confirmation", async () => {
    const removeMcpServer = vi.fn().mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    installHermes({
      listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS),
      removeMcpServer,
    });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    const removeButtons = screen.getAllByText("mcp.remove");
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(removeMcpServer).toHaveBeenCalledWith("github", undefined);
    });
    confirmSpy.mockRestore();
  });

  it("does not call removeMcpServer if the user cancels the confirm", async () => {
    const removeMcpServer = vi.fn().mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    installHermes({
      listMcpServers: vi.fn().mockResolvedValue(SAMPLE_SERVERS),
      removeMcpServer,
    });
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
    });
    const removeButtons = screen.getAllByText("mcp.remove");
    fireEvent.click(removeButtons[0]);
    // Microtask to allow the click handler to settle.
    await act(async () => {});
    expect(removeMcpServer).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe("Mcp search panel", () => {
  it("renders the search input", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText("mcp.searchPlaceholder"),
    ).toBeInTheDocument();
  });

  it("filters the bundled catalog by free-text query", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
    const search = screen.getByPlaceholderText("mcp.searchPlaceholder");
    fireEvent.change(search, { target: { value: "github" } });
    // GitHub is the only entry whose name/title/description contains
    // "github" in the bundled registry.
    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });
    // SQLite and Exa are not in the result set.
    expect(screen.queryByText("SQLite")).not.toBeInTheDocument();
    expect(screen.queryByText("Exa")).not.toBeInTheDocument();
  });

  it("shows the no-results message when the query matches nothing", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
    const search = screen.getByPlaceholderText("mcp.searchPlaceholder");
    fireEvent.change(search, { target: { value: "zzz-no-such-server" } });
    await waitFor(() => {
      expect(screen.getByText("mcp.searchNoResults")).toBeInTheDocument();
    });
  });

  it("clicking Add on a registry entry opens the add form with the entry prefilled", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
    const search = screen.getByPlaceholderText("mcp.searchPlaceholder");
    // "github" requires env keys, so it is NOT a one-click candidate and
    // still opens the add form (one-click entries show "Install" instead).
    fireEvent.change(search, { target: { value: "github" } });
    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });
    // The first "mcp.add" button is the registry quick-add.
    const quickAddButtons = screen.getAllByText("mcp.add");
    fireEvent.click(quickAddButtons[0]);
    // Add form opens and the name is prefilled.
    await waitFor(() => {
      expect(screen.getByText("mcp.addName")).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText(
      "mcp.addNamePlaceholder",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("github");
  });

  it("one-click candidates show an Install button instead of Add", async () => {
    installHermes();
    render(<Mcp />);
    await waitFor(() => {
      expect(screen.getByText("mcp.empty")).toBeInTheDocument();
    });
    const search = screen.getByPlaceholderText("mcp.searchPlaceholder");
    // "playwright" has no envKeys and uses npx → one-click install.
    fireEvent.change(search, { target: { value: "playwright" } });
    await waitFor(() => {
      expect(screen.getByText("Playwright")).toBeInTheDocument();
    });
    expect(screen.getByText("mcp.oneClickInstall")).toBeInTheDocument();
  });
});

describe("Mcp registry validation", () => {
  it("accepts an http URL", async () => {
    const { validateMcpDetail } = await import("./registry");
    expect(validateMcpDetail("http", "https://mcp.example.com/mcp")).toBeNull();
    expect(validateMcpDetail("http", "http://localhost:8000/mcp")).toBeNull();
  });

  it("rejects an http transport without http(s) scheme", async () => {
    const { validateMcpDetail } = await import("./registry");
    expect(validateMcpDetail("http", "ftp://x")).toBe("httpScheme");
    expect(validateMcpDetail("http", "mcp.example.com")).toBe("httpScheme");
  });

  it("accepts stdio commands with a known runtime prefix", async () => {
    const { validateMcpDetail } = await import("./registry");
    expect(
      validateMcpDetail("stdio", "npx -y @x/y"),
    ).toBeNull();
    expect(
      validateMcpDetail("stdio", "node server.js"),
    ).toBeNull();
    expect(
      validateMcpDetail("stdio", "python -m myserver"),
    ).toBeNull();
  });

  it("rejects stdio commands without a known runtime prefix", async () => {
    const { validateMcpDetail } = await import("./registry");
    expect(validateMcpDetail("stdio", "/usr/bin/foo")).toBe("stdioPrefix");
    expect(validateMcpDetail("stdio", "bash -c 'echo'")).toBe("stdioPrefix");
  });

  it("rejects empty or overlong detail", async () => {
    const { validateMcpDetail } = await import("./registry");
    expect(validateMcpDetail("http", "")).toBe("empty");
    expect(validateMcpDetail("http", "x".repeat(3000))).toBe("tooLong");
  });
});
