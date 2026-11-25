import { createContext, useContext, useEffect, useState } from "react";
import { Theme as AstryxTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "dark",
  setTheme: () => {},
});

import { THEME_STORAGE_KEY as STORAGE_KEY } from "../constants";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system")
      return stored;
    return "system";
  });
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(theme));

  function setTheme(next: Theme): void {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange(): void {
      if (theme === "system") {
        setResolved(getSystemTheme());
      }
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Update resolved whenever theme changes
  useEffect(() => {
    setResolved(resolve(theme));
  }, [theme]);

  // Apply data-theme + data-astryx-theme attribute to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-astryx-theme", "neutral");
  }, [resolved]);
  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      <AstryxTheme theme={neutralTheme} mode={resolved}>
        {children}
      </AstryxTheme>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
