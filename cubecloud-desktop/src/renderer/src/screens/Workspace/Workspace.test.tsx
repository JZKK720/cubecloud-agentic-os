import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Workspace from "./Workspace";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: () => {},
  }),
}));

function installApis(
  overrides: Partial<Window["hermesAPI"]> = {},
): Partial<Window["hermesAPI"]> {
  const api: Partial<Window["hermesAPI"]> = {
    codegraphCliStatus: vi.fn().mockResolvedValue({
      installed: false,
      command: null,
      version: null,
      docsUrl: "https://colbymchenry.github.io/codegraph/",
      error: null,
    }),
    codegraphInstallCli: vi.fn().mockResolvedValue({
      success: true,
      status: {
        installed: true,
        command: "codegraph.cmd",
        version: "0.9.8",
        docsUrl: "https://colbymchenry.github.io/codegraph/",
        error: null,
      },
    }),
    codegraphSetupHermes: vi.fn().mockResolvedValue({ success: true }),
    codegraphProjectStatus: vi.fn().mockResolvedValue({
      success: true,
      status: {
        initialized: true,
        projectPath: "D:\\repo",
        fileCount: 10,
        nodeCount: 20,
        edgeCount: 30,
        dbSizeBytes: 1024,
        backend: "node:sqlite",
        journalMode: "wal",
        languages: ["TypeScript"],
        pendingChanges: { added: 0, modified: 0, removed: 0 },
        worktreeMismatch: null,
      },
    }),
    codegraphInitProject: vi.fn(),
    codegraphBuildContext: vi.fn().mockResolvedValue({
      success: true,
      context: "## Workspace context\nGraph details.",
    }),
    selectFolder: vi.fn().mockResolvedValue("D:\\repo"),
    openExternal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
  });

  Object.defineProperty(window, "electron", {
    configurable: true,
    value: {
      process: {
        platform: "win32",
        versions: {
          chrome: "1",
          electron: "1",
          node: "20",
        },
      },
    },
  });

  return api;
}

describe("Workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("installs the CodeGraph CLI from the runtime card", async () => {
    const api = installApis();

    render(<Workspace />);

    await waitFor(() => {
      expect(api.codegraphCliStatus).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Install CodeGraph CLI" }),
    );

    await waitFor(() => {
      expect(api.codegraphInstallCli).toHaveBeenCalledTimes(1);
    });
  });

  it("hands the generated context bundle off to Chat as a text attachment", async () => {
    window.localStorage.setItem("agent-desktop.workspace.project-path", "D:\\repo");
    const onOpenInChat = vi.fn();
    installApis({
      codegraphCliStatus: vi.fn().mockResolvedValue({
        installed: true,
        command: "codegraph.cmd",
        version: "0.9.8",
        docsUrl: "https://colbymchenry.github.io/codegraph/",
        error: null,
      }),
    });

    render(<Workspace onOpenInChat={onOpenInChat} />);

    await waitFor(() => {
      expect(screen.getByText("D:\\repo")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Build context bundle" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Use in Chat" }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Use in Chat" }));

    expect(onOpenInChat).toHaveBeenCalledTimes(1);
    expect(onOpenInChat).toHaveBeenCalledWith({
      text: "",
      attachments: [
        expect.objectContaining({
          kind: "text-file",
          name: "codegraph-context-repo.md",
          mime: "text/markdown",
          text: "## Workspace context\nGraph details.",
        }),
      ],
    });
  });
});