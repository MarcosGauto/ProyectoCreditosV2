"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

/**
 * Compact Dark / Light toggle for the global header.
 *
 * @param {{ className?: string }} props
 */
export function ThemeToggle({ className }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === "dark" : true

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-xl border border-border bg-card p-0.5",
        className
      )}
      role="group"
      aria-label="Tema"
    >
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
          isDark
            ? "bg-secondary text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={isDark}
        title="Tema oscuro"
      >
        <Moon className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Dark</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
          !isDark
            ? "bg-secondary text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={!isDark}
        title="Tema claro"
      >
        <Sun className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Light</span>
      </button>
    </div>
  )
}
