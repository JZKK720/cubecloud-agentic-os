import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

// Vitest 4 needs the lifecycle hook to be registered as a global
// (the project already has `globals: true` in vitest.config.ts);
// pulling `afterEach` from "vitest" causes the well-known
// "failed to find the current suite" failure at every test file.
// Using the global here avoids importing the API in a context
// where no suite is active yet.
afterEach(() => {
  cleanup();
});
