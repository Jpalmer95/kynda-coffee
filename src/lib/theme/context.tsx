"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  themeMode: ThemeMode;
  /** "light" or "dark" — the actual resolved theme applied to the DOM */
  resolvedTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function getPersistedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem("kynda-theme");
    if (stored === "system" || stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage disabled
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  // Read persisted preference on mount (avoid SSR mismatch)
  useEffect(() => {
    setThemeMode(getPersistedTheme());
    setHydrated(true);
  }, []);

  // Resolve theme whenever mode changes or system preference changes
  useEffect(() => {
    setResolvedTheme(resolveTheme(themeMode));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(resolveTheme(themeMode));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode]);

  const handleChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem("kynda-theme", mode);
    } catch {
      // localStorage disabled
    }
  }, []);

  // Apply dark class + data attribute for CSS variable mapping
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [resolvedTheme]);

  // Also sync with the system-color-scheme-change meta tag for viewport
  useEffect(() => {
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", resolvedTheme);
  }, [resolvedTheme]);

  // Prevent flash-of-wrong-theme on hydration
  // We apply a no-transition class until hydration is complete
  useEffect(() => {
    if (hydrated) {
      document.documentElement.classList.remove("no-transitions");
    }
  }, [hydrated]);

  // Initialize no-transitions class early
  useEffect(() => {
    document.documentElement.classList.add("no-transitions");
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("no-transitions");
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ themeMode, resolvedTheme, setThemeMode: handleChange }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
