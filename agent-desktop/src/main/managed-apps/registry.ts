// ManagedApp registry — Phase B. One place that knows every adapter;
// the snapshot test pins the roster so accidental additions/removals
// are caught.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { createWorkspaceApp } from "./workspace";
import { createEverOsApp } from "./everos";
import { createGatewayApps } from "./gateways";
import {
  createOpenVikingApp,
  createWeknoraApp,
  createGbrainApp,
  createAgentReachApp,
  createGraphifyApp,
  createBrowserHarnessApp,
  createLayaApp,
  createCodeGraphApp,
  createHeadroomApp,
  createMooTasksApp,
} from "./tools";
import type { ManagedApp } from "./contract";

/** The full adapter roster (design §2.2). Order is display order. */
export function createManagedAppRegistry(): ManagedApp[] {
  return [
    createWorkspaceApp(),
    createEverOsApp(),
    ...createGatewayApps(),
    createOpenVikingApp(),
    createWeknoraApp(),
    createGbrainApp(),
    createHeadroomApp(),
    createCodeGraphApp(),
    createMooTasksApp(),
    createAgentReachApp(),
    createGraphifyApp(),
    createBrowserHarnessApp(),
    createLayaApp(),
  ];
}

/** The expected roster ids — pinned by the snapshot test. */
export const EXPECTED_MANAGED_APP_IDS = [
  "ai-workspace",
  "everos",
  "hermes",
  "ironclaw",
  "openclaw",
  "raven",
  "openviking",
  "weknora",
  "gbrain",
  "headroom",
  "codegraph",
  "moo-tasks",
  "agent-reach",
  "graphify",
  "browser-harness",
  "laya",
] as const;

export type ManagedAppId = (typeof EXPECTED_MANAGED_APP_IDS)[number];