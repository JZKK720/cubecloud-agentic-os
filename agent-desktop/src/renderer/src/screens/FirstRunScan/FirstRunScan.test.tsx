// FirstRunScan tests — scan-first onboarding (docs/plans/2026-10-07-
// scan-first-onboarding-redesign.md §8 step 3). Fixtures cover the four
// scan outcomes from the redesign doc: found / not-found / manual
// connect / legacy-wizard escape, plus the App-level routing change.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: () => {},
  }),
}));

import FirstRunScan from "./FirstRunScan";

type ProbeResult = Awaited<
  ReturnType<Window["hermesAPI"]["workspaceProbe"]>
>;

function makeProbe(
  overrides: Partial<ProbeResult> = {},
): ProbeResult {
  return {
    reachable: true,
    baseUrl: "http://127.0.0.1:6767",
    health: { status: "ok", body: { status: "ok" } },
    info: { name: "cubecloud-agent", version: "0.4.0" },
    stack: null,
    error: null,
    scannedAt: new Date().toISOString(),
    ...overrides,
  };
}

function installHermesAPI(
  overrides: Partial<Window["hermesAPI"]> = {},
): void {
  const api: Partial<Window["hermesAPI"]> = {
    workspaceProbe: vi.fn().mockResolvedValue(makeProbe()),
    scanLocalServers: vi.fn().mockResolvedValue({
      scannedAt: new Date().toISOString(),
      hosts: ["127.0.0.1"],
      probes: [],
      reachable: [],
      suggestions: [],
    }),
    listWorkspaceSessions: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: "s1" },
        { id: "s2" },
      ] as unknown as Awaited<
        ReturnType<Window["hermesAPI"]["listWorkspaceSessions"]>
      >["data"],
      hasMore: false,
    }),
    listWorkspaceAgents: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: "a1" }] as unknown as Awaited<
        ReturnType<Window["hermesAPI"]["listWorkspaceAgents"]>
      >["data"],
      hasMore: false,
    }),
    setConnectionConfig: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
  });
}

beforeEach(() => {
  installHermesAPI();
});

describe("FirstRunScan — scan phase", () => {
  it("starts in the scanning phase and resolves to found when the workspace answers", async () => {
    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    expect(screen.getByText("firstrun.title")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("firstrun.foundTitle")).toBeInTheDocument();
    });
    expect(screen.getByText("http://127.0.0.1:6767")).toBeInTheDocument();
    // Live counts rendered from the read-only mirrors.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("resolves to not-found when the workspace probe is unreachable", async () => {
    installHermesAPI({
      workspaceProbe: vi.fn().mockResolvedValue(
        makeProbe({ reachable: false, error: "connection refused" }),
      ),
    });

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.notFoundTitle")).toBeInTheDocument();
    });
    expect(screen.getByText("firstrun.startWithDocker")).toBeInTheDocument();
    expect(screen.getByText("firstrun.scanAgain")).toBeInTheDocument();
    expect(screen.getByText("firstrun.advancedConnect")).toBeInTheDocument();
  });

  it("resolves to not-found when the probe rejects (timeout/exception)", async () => {
    installHermesAPI({
      workspaceProbe: vi.fn().mockRejectedValue(new Error("timeout")),
    });

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.notFoundTitle")).toBeInTheDocument();
    });
  });
});

describe("FirstRunScan — found phase", () => {
  it("connect persists the workspace origin as the remote connection, then shows the connected phase", async () => {
    const setConnectionConfig = vi.fn().mockResolvedValue(undefined);
    installHermesAPI({ setConnectionConfig });

    const onComplete = vi.fn();
    render(
      <FirstRunScan onComplete={onComplete} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.foundTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.connect"));

    await waitFor(() => {
      expect(setConnectionConfig).toHaveBeenCalledWith(
        "remote",
        "http://127.0.0.1:6767",
        "",
        "hermes",
      );
      expect(screen.getByText("firstrun.connectedTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.enterConsole"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("connect failure surfaces the error and stays on the found phase", async () => {
    installHermesAPI({
      setConnectionConfig: vi.fn().mockRejectedValue(new Error("denied")),
    });

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.foundTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.connect"));

    await waitFor(() => {
      expect(screen.getByText("denied")).toBeInTheDocument();
    });
    expect(screen.getByText("firstrun.foundTitle")).toBeInTheDocument();
  });
});

describe("FirstRunScan — not-found doors", () => {
  it("scan again re-runs the probes", async () => {
    const workspaceProbe = vi
      .fn()
      .mockResolvedValueOnce(
        makeProbe({ reachable: false, error: "refused" }),
      )
      .mockResolvedValueOnce(makeProbe());
    installHermesAPI({ workspaceProbe });

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.notFoundTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.scanAgain"));

    await waitFor(() => {
      expect(screen.getByText("firstrun.foundTitle")).toBeInTheDocument();
    });
    expect(workspaceProbe).toHaveBeenCalledTimes(2);
  });

  it("manual connect probes the entered origin and advances to found on success", async () => {
    installHermesAPI({
      workspaceProbe: vi
        .fn()
        .mockResolvedValueOnce(
          makeProbe({ reachable: false, error: "refused" }),
        )
        .mockResolvedValue(
          makeProbe({ baseUrl: "http://localhost:6768" }),
        ),
    });

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.notFoundTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.advancedConnect"));
    fireEvent.change(screen.getByPlaceholderText("firstrun.urlPlaceholder"), {
      target: { value: "localhost:6768" },
    });
    fireEvent.click(screen.getByText("firstrun.connectUrl"));

    await waitFor(() => {
      expect(screen.getByText("firstrun.foundTitle")).toBeInTheDocument();
    });
    expect(screen.getByText("http://localhost:6768")).toBeInTheDocument();
  });

  it("manual connect with an unreachable origin shows the error and stays", async () => {
    installHermesAPI({
      workspaceProbe: vi
        .fn()
        .mockResolvedValueOnce(
          makeProbe({ reachable: false, error: "refused" }),
        )
        .mockResolvedValue(
          makeProbe({ reachable: false, error: "no answer" }),
        ),
    });

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.notFoundTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.advancedConnect"));
    fireEvent.change(screen.getByPlaceholderText("firstrun.urlPlaceholder"), {
      target: { value: "localhost:6768" },
    });
    fireEvent.click(screen.getByText("firstrun.connectUrl"));

    await waitFor(() => {
      expect(screen.getByText("no answer")).toBeInTheDocument();
    });
    expect(screen.queryByText("firstrun.foundTitle")).toBeNull();
  });

  it("the legacy wizard footer link fires onLegacySetup", async () => {
    installHermesAPI({
      workspaceProbe: vi.fn().mockResolvedValue(
        makeProbe({ reachable: false, error: "refused" }),
      ),
    });
    const onLegacySetup = vi.fn();

    render(
      <FirstRunScan onComplete={vi.fn()} onLegacySetup={onLegacySetup} />,
    );

    await waitFor(() => {
      expect(screen.getByText("firstrun.notFoundTitle")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("firstrun.fallbackWizard"));
    expect(onLegacySetup).toHaveBeenCalledTimes(1);
  });
});
