"use client"

import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
