import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { expect } from "vitest";

expect.extend(matchers);

// Vitest's jsdom environment does not expose `localStorage` on the global,
// even when `environmentOptions.jsdom.url` gives the window a real origin
// (verified: window.location is http://localhost/ while typeof
// window.localStorage is still "undefined"). Several suites call
// `localStorage.clear()` in `beforeEach`, which then dies with
// "Cannot read properties of undefined (reading 'clear')" — that is the
// source of the long-standing 14-failure baseline, misread as unrelated
// noise. Install a minimal in-memory Storage so the suites exercise the
// code they were written to exercise.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === "undefined") {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  }
}

// Vitest 4 needs the lifecycle hook to be registered as a global
// (the project already has `globals: true` in vitest.config.ts);
// pulling `afterEach` from "vitest" causes the well-known
// "failed to find the current suite" failure at every test file.
// Using the global here avoids importing the API in a context
// where no suite is active yet.
afterEach(() => {
  cleanup();
});
