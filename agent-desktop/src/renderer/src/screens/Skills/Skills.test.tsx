import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/** Wait for the REAL UI condition, not a proxy.
 *
 *  The screen renders only a spinner while `loading` is true, so
 *  `.skills-tab` does not exist until the lists have resolved AND React has
 *  re-rendered. Waiting on a mock (`expect(listBundledSkills).toHaveBeenCalled`)
 *  is true the moment the effect fires — before that render — so the DOM query
 *  that follows can find nothing and `fireEvent.click(undefined)` throws. That
 *  is a load-sensitive race, not a product bug. Always wait on the element the
 *  next step actually uses. */
async function waitForBrowseTab(
  container: HTMLElement,
): Promise<HTMLButtonElement> {
  let tab: HTMLButtonElement | null = null;
  await waitFor(() => {
    tab = container.querySelectorAll(".skills-tab")[1] as HTMLButtonElement | null;
    expect(tab).toBeTruthy();
  });
  return tab!;
}

// useI18n needs an I18nProvider; pass-through `t` keeps the test focused
// on the install-click → IPC contract.
vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: () => {},
  }),
}));

// AgentMarkdown is only used in the (unrelated) detail panel.
vi.mock("../../components/AgentMarkdown", () => ({
  AgentMarkdown: ({ content }: { content: string }) => <pre>{content}</pre>,
}));

import Skills from "./Skills";

describe("Skills.tsx — Install button (issue #310 diagnosis)", () => {
  it("calls window.hermesAPI.installSkill(skill.name, profile) when Install is clicked on a Browse card", async () => {
    const installSkill = vi.fn().mockResolvedValue({ success: true });
    const listInstalledSkills = vi.fn().mockResolvedValue([]);
    const listBundledSkills = vi.fn().mockResolvedValue([
      {
        name: "concept-diagram",
        description: "draw diagrams",
        category: "creative",
        source: "bundled",
        installed: false,
      },
    ]);
    const getSkillContent = vi.fn().mockResolvedValue("");

    Object.defineProperty(window, "hermesAPI", {
      configurable: true,
      value: {
        installSkill,
        listInstalledSkills,
        listBundledSkills,
        getSkillContent,
      },
    });

    const view = render(<Skills />);

    // Wait for both list-loads to resolve and the loading spinner to clear.
    await waitFor(() => {
      expect(listBundledSkills).toHaveBeenCalled();
      expect(listInstalledSkills).toHaveBeenCalled();
    });

    // Wait for the loaded UI (the tab only renders once `loading` clears),
    // then switch to Browse so the bundled card renders.
    const browseTab = await waitForBrowseTab(view.container);
    await act(async () => {
      fireEvent.click(browseTab);
    });

    // Find the Install button on the bundled card.
    let installBtn: HTMLButtonElement | null = null;
    await waitFor(() => {
      installBtn = view.container.querySelector(
        ".skills-card-install-btn",
      ) as HTMLButtonElement | null;
      expect(installBtn).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(installBtn!);
    });

    // The proof: click reaches handleInstall, which calls the bridge method
    // with the card's skill.name and the current profile (undefined here).
    expect(installSkill).toHaveBeenCalledTimes(1);
    expect(installSkill).toHaveBeenCalledWith("concept-diagram", undefined);
  });

  it("surfaces the CLI error in the UI when installSkill returns success:false (issue #310 fix)", async () => {
    const cliMessage =
      "No exact match for 'concept-diagram'. Did you mean one of these?\n" +
      "concept-diagrams - official/creative/concept-diagrams";
    const installSkill = vi
      .fn()
      .mockResolvedValue({ success: false, error: cliMessage });
    const listInstalledSkills = vi.fn().mockResolvedValue([]);
    const listBundledSkills = vi.fn().mockResolvedValue([
      {
        name: "concept-diagram",
        description: "",
        category: "creative",
        source: "bundled",
        installed: false,
      },
    ]);
    const getSkillContent = vi.fn().mockResolvedValue("");

    Object.defineProperty(window, "hermesAPI", {
      configurable: true,
      value: {
        installSkill,
        listInstalledSkills,
        listBundledSkills,
        getSkillContent,
      },
    });

    const view = render(<Skills />);
    await waitFor(() => expect(listBundledSkills).toHaveBeenCalled());

    const browseTab = await waitForBrowseTab(view.container);
    await act(async () => {
      fireEvent.click(browseTab);
    });

    let installBtn: HTMLButtonElement | null = null;
    await waitFor(() => {
      installBtn = view.container.querySelector(
        ".skills-card-install-btn",
      ) as HTMLButtonElement | null;
      expect(installBtn).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(installBtn!);
    });

    // The CLI's failure message reaches the user via the .skills-error
    // banner — no more "button flashed and nothing happened".
    await waitFor(() => {
      const banner = view.container.querySelector(".skills-error");
      expect(banner).toBeTruthy();
      expect(banner!.textContent).toContain("No exact match for");
      expect(banner!.textContent).toContain("Did you mean");
    });
  });
});
