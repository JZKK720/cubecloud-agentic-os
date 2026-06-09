import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { I18nProvider } from "./I18nProvider";
import {
  DesignDialsControl,
  DESIGN_DIAL_DEFAULTS,
} from "./DesignDials";

function installHermesAPI(): void {
  const api: Pick<Window["hermesAPI"], "getLocale" | "setLocale"> = {
    getLocale: vi.fn().mockResolvedValue("en"),
    setLocale: vi.fn().mockResolvedValue("en"),
  };
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
    writable: true,
  });
}

function getSlider(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

async function renderControl(
  ui: React.ReactElement,
): Promise<ReturnType<typeof render>> {
  let result: ReturnType<typeof render> | null = null;
  await act(async () => {
    result = render(<I18nProvider>{ui}</I18nProvider>);
  });
  return result!;
}

describe("DesignDialsControl (Step 5 component)", () => {
  beforeEach(() => {
    installHermesAPI();
  });

  afterEach(() => {
    try {
      localStorage.removeItem("hermes-locale");
    } catch {
      /* ignore */
    }
  });

  it("renders three labelled sliders with their numeric values", async () => {
    await renderControl(
      <DesignDialsControl
        value={{ variance: 20, motion: 40, density: 60 }}
        onChange={() => {}}
      />,
    );
    // Rendered strings come from the bundled i18n catalog.
    const title = await screen.findByText("Design Dials");
    expect(title).toBeTruthy();
    expect(getSlider("Variance").value).toBe("20");
    expect(getSlider("Motion").value).toBe("40");
    expect(getSlider("Density").value).toBe("60");
    // The three numeric badges are visible too.
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getByText("60")).toBeTruthy();
  });

  it("calls onChange with a clamped integer when the user drags a slider", async () => {
    const onChange = vi.fn();
    await renderControl(
      <DesignDialsControl
        value={{ variance: 20, motion: 40, density: 60 }}
        onChange={onChange}
      />,
    );
    await screen.findByText("Design Dials");
    fireEvent.change(getSlider("Variance"), { target: { value: "73" } });
    expect(onChange).toHaveBeenCalledWith({
      variance: 73,
      motion: 40,
      density: 60,
    });
  });

  it("clamps out-of-range slider input to [0, 100]", async () => {
    const onChange = vi.fn();
    await renderControl(
      <DesignDialsControl
        value={{ variance: 50, motion: 50, density: 50 }}
        onChange={onChange}
      />,
    );
    await screen.findByText("Design Dials");
    fireEvent.change(getSlider("Motion"), { target: { value: "999" } });
    expect(onChange).toHaveBeenLastCalledWith({
      variance: 50,
      motion: 100,
      density: 50,
    });
    fireEvent.change(getSlider("Motion"), { target: { value: "-7" } });
    expect(onChange).toHaveBeenLastCalledWith({
      variance: 50,
      motion: 0,
      density: 50,
    });
  });

  it("reset button fires onChange with the documented defaults", async () => {
    const onChange = vi.fn();
    await renderControl(
      <DesignDialsControl
        value={{ variance: 1, motion: 2, density: 3 }}
        onChange={onChange}
      />,
    );
    await screen.findByText("Design Dials");
    fireEvent.click(screen.getByText("Reset to defaults"));
    expect(onChange).toHaveBeenCalledWith({ ...DESIGN_DIAL_DEFAULTS });
  });

  it("compact mode hides the per-dial hint text", async () => {
    await renderControl(
      <DesignDialsControl
        value={{ variance: 10, motion: 20, density: 30 }}
        onChange={() => {}}
        compact
      />,
    );
    await screen.findByText("Design Dials");
    // The hint strings are only rendered in non-compact mode.
    expect(
      screen.queryByText(
        "How expressive the phrasing is. 0 = dry and literal, 100 = metaphorical and colorful.",
      ),
    ).toBeNull();
  });
});
