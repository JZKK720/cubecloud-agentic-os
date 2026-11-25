import { useCallback, useEffect, useState } from "react";
import { isRuntimePane, MAX_RAIL_PINS, type RuntimePane } from "./catalog";

const STORAGE_KEY = "cubecloud.runtime-rail-pins";

function readPins(): RuntimePane[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique: RuntimePane[] = [];
    for (const item of parsed) {
      if (isRuntimePane(item) && !unique.includes(item)) unique.push(item);
    }
    return unique.slice(0, MAX_RAIL_PINS);
  } catch {
    return [];
  }
}

function writePins(pins: RuntimePane[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    /* localStorage may be unavailable; pins are a convenience, not state */
  }
}

/**
 * Operator-chosen shortcuts from the Runtime hub onto the primary rail.
 * Persisted to localStorage so the rail survives restarts; the hub always
 * shows every capability regardless of what is pinned.
 */
export function useRuntimePins(): {
  pins: RuntimePane[];
  isPinned: (view: RuntimePane) => boolean;
  togglePin: (view: RuntimePane) => void;
} {
  const [pins, setPins] = useState<RuntimePane[]>(() => readPins());

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY) setPins(readPins());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const togglePin = useCallback((view: RuntimePane): void => {
    setPins((current) => {
      const next = current.includes(view)
        ? current.filter((v) => v !== view)
        : [...current, view].slice(-MAX_RAIL_PINS);
      writePins(next);
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (view: RuntimePane): boolean => pins.includes(view),
    [pins],
  );

  return { pins, isPinned, togglePin };
}
