"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Global theme provider (next-themes).
 * Persists to localStorage (`gn-theme`), uses class strategy for Tailwind `dark:`.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="gn-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
