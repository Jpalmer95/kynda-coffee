import { useTheme } from "@/lib/theme/context";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-latte/20 px-1 py-1">
      <button
        onClick={() => setThemeMode("light")}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          themeMode === "light"
            ? "bg-card text-espresso shadow-sm"
            : "text-mocha hover:text-espresso"
        }`}
        aria-label="Use light theme"
        aria-pressed={themeMode === "light"}
      >
        <Sun className="h-3 w-3" />
        Light
      </button>
      <button
        onClick={() => setThemeMode("dark")}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          themeMode === "dark"
            ? "bg-card text-espresso shadow-sm"
            : "text-mocha hover:text-espresso"
        }`}
        aria-label="Use dark theme"
        aria-pressed={themeMode === "dark"}
      >
        <Moon className="h-3 w-3" />
        Dark
      </button>
      <button
        onClick={() => setThemeMode("system")}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          themeMode === "system"
            ? "bg-card text-espresso shadow-sm"
            : "text-mocha hover:text-espresso"
        }`}
        aria-label="Use system theme preference"
        aria-pressed={themeMode === "system"}
      >
        <Monitor className="h-3 w-3" />
        Auto
      </button>
    </div>
  );
}
