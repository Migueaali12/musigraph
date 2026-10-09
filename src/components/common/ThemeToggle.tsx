"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useSystemPrefersDark } from "@/hooks/useSystemPrefersDark"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const systemPrefersDark = useSystemPrefersDark()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
