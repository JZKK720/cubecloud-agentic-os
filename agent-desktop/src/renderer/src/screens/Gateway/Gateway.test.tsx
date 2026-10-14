// Gateway screen — destructive-action confirmation.
//
// Pins the operator-gating behaviour: stopping the gateway (which takes
// every enabled IM platform offline) requires an explicit confirmation,
// while starting it stays one click. Verified live via CDP that the
// one-click start path is correct; this test covers the destructive path
// without spawning a real gateway process.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Gateway from "./Gateway";

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
    getEnv: vi.fn().mockResolvedValue({}),
    gatewayStatus: vi.fn().mockResolvedValue(true),
    getPlatformEnabled: vi.fn().mockResolvedValue({}),
    startGateway: vi.fn().mockResolvedValue(true),
    stopGateway: vi.fn().mockResolvedValue(undefined),
    setPlatformEnabled: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
    writable: true,
  });
  return api;
}

describe("Gateway screen — stop confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT call stopGateway on the first click; it asks first", async () => {
    const api = installApis({
      gatewayStatus: vi.fn().mockResolvedValue(true),
    });
    render(<Gateway />);

    const stop = await waitFor(() =>
      screen.getByRole("button", { name: "common.stop" }),
    );
    fireEvent.click(stop);

    // The screen must not have stopped anything yet.
    expect(api.stopGateway).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeTruthy();
    expect(
      screen.getByText("gateway.confirmStopTitle"),
    ).toBeTruthy();
  });

  it("calls stopGateway only after the operator confirms", async () => {
    const api = installApis({
      gatewayStatus: vi.fn().mockResolvedValue(true),
    });
    render(<Gateway />);

    fireEvent.click(
      await waitFor(() =>
        screen.getByRole("button", { name: "common.stop" }),
      ),
    );
    await screen.findByRole("alertdialog");

    fireEvent.click(
      screen.getByRole("button", { name: "gateway.confirmStopConfirm" }),
    );

    await waitFor(() => expect(api.stopGateway).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("cancelling leaves the gateway running and calls nothing", async () => {
    const api = installApis({
      gatewayStatus: vi.fn().mockResolvedValue(true),
    });
    render(<Gateway />);

    fireEvent.click(
      await waitFor(() =>
        screen.getByRole("button", { name: "common.stop" }),
      ),
    );
    await screen.findByRole("alertdialog");

    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.stopGateway).not.toHaveBeenCalled();
  });

  it("keeps START one click — starting is not destructive", async () => {
    const api = installApis({
      gatewayStatus: vi.fn().mockResolvedValue(false),
    });
    render(<Gateway />);

    fireEvent.click(
      await waitFor(() =>
        screen.getByRole("button", { name: "common.start" }),
      ),
    );

    await waitFor(() => expect(api.startGateway).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
