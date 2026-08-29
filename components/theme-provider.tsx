"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import {
  parseThemePreference,
  THEME_STORAGE_KEY,
  writeThemeCookie,
} from "@/lib/theme-cookie"

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

function ThemeCookieSync() {
  const { theme } = useTheme()

  React.useEffect(() => {
    const preference = parseThemePreference(theme)
    if (preference) writeThemeCookie(preference)
  }, [theme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
      {...props}
    >
      <ThemeCookieSync />
      {children}
    </NextThemesProvider>
  )
}
