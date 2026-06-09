/**
 * Smoke test: ensure the Learnings surface renders without throwing
 * when its IPC stubs are wired up.
 */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/renderer/src/components/I18nProvider";
import Learnings from "../src/renderer/src/screens/Memory/Learnings";

function renderWithI18n(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <I18nProvider value={{ locale: "en", setLocale: () => {} }}>
      {ui}
    </I18nProvider>,
  );
}

describe("Learnings surface", () => {
  beforeEach(() => {
    (window as unknown as { hermesAPI: unknown }).hermesAPI = {
      learningsRead: vi.fn().mockResolvedValue([]),
      learningsStats: vi.fn().mockResolvedValue({
        total: 0,
        unique: 0,
        byType: {},
        bySource: {},
        averageConfidence: 0,
        topKeys: [],
      }),
      learningsFindStale: vi.fn().mockResolvedValue([]),
      learningsSearch: vi.fn().mockResolvedValue([]),
      learningsExport: vi.fn().mockResolvedValue(""),
      learningsClear: vi.fn().mockResolvedValue({ success: true }),
      learningsFileInfo: vi.fn().mockResolvedValue({
        exists: false,
        size: 0,
        lastModified: null,
      }),
      learningsAppend: vi.fn().mockResolvedValue({}),
      copyToClipboard: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("renders the empty state when there are no learnings", async () => {
    renderWithI18n(<Learnings />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "No learnings yet. They will be appended here as they occur.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders the search input and the Add button", async () => {
    renderWithI18n(<Learnings />);
    expect(
      screen.getByPlaceholderText(
        "Search by key, skill, or insight\u2026",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Add learning")).toBeInTheDocument();
  });

  it("opens the Add modal when the Add button is clicked", async () => {
    renderWithI18n(<Learnings />);
    fireEvent.click(screen.getByText("Add learning"));
    await waitFor(() => {
      expect(screen.getByText("Add a learning")).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText("e.g. careful.rm-recursive"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("What did we learn?"),
    ).toBeInTheDocument();
  });
});
