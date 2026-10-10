"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { useSystemPrefersDark } from "@/hooks/useSystemPrefersDark"

// Client-only flag without a setState-in-effect round trip: the server snapshot
// is false (placeholder icon), the client snapshot is true (interactive).
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const systemPrefersDark = useSystemPrefersDark()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="control control-icon"
        disabled
      >
        <Sun className="h-4 w-4" strokeWidth={1.5} />
      </button>
    )
  }

  const isDark = resolvedTheme === "dark" || (resolvedTheme !== "light" && systemPrefersDark)

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="control control-icon"
    >
      <span className="relative block h-4 w-4">
        <Sun
          strokeWidth={1.5}
          className={`absolute inset-0 h-4 w-4 transition-opacity duration-150 ${
            isDark ? "opacity-0" : "opacity-100"
          }`}
        />
        <Moon
          strokeWidth={1.5}
          className={`absolute inset-0 h-4 w-4 transition-opacity duration-150 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
    </button>
  )
}
