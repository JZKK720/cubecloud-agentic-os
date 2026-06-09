/**
 * Smoke + behavioural tests for the V2.2 PageEditor component
 * (page editing UI for the wiki / raw-sources viewer).
 */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/renderer/src/components/I18nProvider";
import { PageEditor } from "../src/renderer/src/screens/Memory/PageEditor";

vi.mock("../src/renderer/src/components/AgentMarkdown", () => ({
  AgentMarkdown: ({ children }: { children: string }) => (
    <div data-testid="agent-markdown">{children}</div>
  ),
}));

function renderWithI18n(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <I18nProvider value={{ locale: "en", setLocale: () => {} }}>{ui}</I18nProvider>,
  );
}

function makeWikiPage(
  content: string,
  exists = true,
  lastModified: number | null = 1_700_000_000,
) {
  return { content, exists, lastModified, relPath: "wiki/test.md" };
}

describe("Wiki page editor", () => {
  let wikiReadPage: ReturnType<typeof vi.fn>;
  let wikiWritePage: ReturnType<typeof vi.fn>;
  let wikiAppendLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    wikiReadPage = vi.fn().mockResolvedValue(makeWikiPage("# Hello\n\nworld"));
    wikiWritePage = vi.fn().mockResolvedValue({ success: true });
    wikiAppendLog = vi.fn().mockResolvedValue({ ok: true });

    (window as unknown as { hermesAPI: unknown }).hermesAPI = {
      wikiReadPage,
      wikiWritePage,
      wikiAppendLog,
    };

    window.confirm = vi.fn().mockReturnValue(true);
  });

  it("loads the page and renders split-mode editor + preview", async () => {
    renderWithI18n(
      <PageEditor relPath="wiki/test.md" layer="wiki" onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(wikiReadPage).toHaveBeenCalledWith("wiki/test.md", undefined);
    });

    const textarea = screen.getByPlaceholderText("Write markdown here…");
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe("# Hello\n\nworld");

    const preview = screen.getByTestId("agent-markdown");
    expect(preview.textContent).toBe("# Hello\n\nworld");

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("switches to edit-only mode when Edit is clicked", async () => {
    renderWithI18n(
      <PageEditor relPath="wiki/test.md" layer="wiki" onClose={() => {}} />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Edit"));

    expect(screen.queryByTestId("agent-markdown")).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Write markdown here…"),
    ).toBeInTheDocument();
  });

  it("calls wikiWritePage and wikiAppendLog on save", async () => {
    const onClose = vi.fn();
    renderWithI18n(
      <PageEditor relPath="wiki/test.md" layer="wiki" onClose={onClose} />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText(
      "Write markdown here…",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "# Hello\n\nworld\nmore edits" },
    });

    const saveBtn = screen.getByText("Save").closest("button")!;
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(wikiWritePage).toHaveBeenCalledWith(
        "wiki/test.md",
        "# Hello\n\nworld\nmore edits",
        undefined,
      );
    });
    expect(wikiAppendLog).toHaveBeenCalledWith(
      "edit",
      "User edited wiki page: test.md",
      "Path: wiki/test.md, 25 chars",
      undefined,
    );
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("uses 'create' label for new pages and saves anyway", async () => {
    wikiReadPage = vi.fn().mockResolvedValue(
      makeWikiPage("", /* exists */ false, /* mtime */ null),
    );
    (window as unknown as { hermesAPI: unknown }).hermesAPI = {
      wikiReadPage,
      wikiWritePage,
      wikiAppendLog,
    };

    renderWithI18n(
      <PageEditor relPath="wiki/new.md" layer="wiki" onClose={() => {}} />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText(
      "Write markdown here…",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Brand new content" } });

    const createBtn = screen.getByText("Create").closest("button")!;
    expect(createBtn).not.toBeDisabled();
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(wikiWritePage).toHaveBeenCalledWith(
        "wiki/new.md",
        "Brand new content",
        undefined,
      );
    });
  });

  it("surfaces the conflict banner when disk mtime advances between load and save", async () => {
    let readCount = 0;
    wikiReadPage = vi.fn().mockImplementation(async () => {
      readCount += 1;
      return makeWikiPage("# Hello\n\nworld", true, 1_700_000_000 + readCount);
    });
    (window as unknown as { hermesAPI: unknown }).hermesAPI = {
      wikiReadPage,
      wikiWritePage,
      wikiAppendLog,
    };

    renderWithI18n(
      <PageEditor relPath="wiki/test.md" layer="wiki" onClose={() => {}} />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText(
      "Write markdown here…",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "edits" } });

    fireEvent.click(screen.getByText("Save").closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("Page changed on disk")).toBeInTheDocument();
    });
    expect(wikiWritePage).not.toHaveBeenCalled();
  });

  it("renders the raw layer tag and passes layer to wikiAppendLog", async () => {
    renderWithI18n(
      <PageEditor
        relPath="raw/sources/foo.md"
        layer="raw"
        onClose={() => {}}
      />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText(
      "Write markdown here…",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "raw content" } });
    fireEvent.click(screen.getByText("Save").closest("button")!);

    await waitFor(() => {
      expect(wikiAppendLog).toHaveBeenCalledWith(
        "edit",
        "User edited raw page: foo.md",
        "Path: raw/sources/foo.md, 11 chars",
        undefined,
      );
    });
  });

  it("undo button restores the previous draft", async () => {
    renderWithI18n(
      <PageEditor relPath="wiki/test.md" layer="wiki" onClose={() => {}} />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText(
      "Write markdown here…",
    ) as HTMLTextAreaElement;

    const undoBtn = screen.getByTitle("Undo (Ctrl+Z)");
    expect(undoBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "first edit" } });
    expect(undoBtn).not.toBeDisabled();

    fireEvent.click(undoBtn);
    expect((textarea as HTMLTextAreaElement).value).toBe("# Hello\n\nworld");
  });

  it("Escape key on the textarea triggers close callback", async () => {
    const onClose = vi.fn();
    renderWithI18n(
      <PageEditor relPath="wiki/test.md" layer="wiki" onClose={onClose} />,
    );

    await waitFor(() => expect(wikiReadPage).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText(
      "Write markdown here…",
    ) as HTMLTextAreaElement;
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
