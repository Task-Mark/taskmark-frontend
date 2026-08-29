"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Switch between light and dark theme"
      title="Switch between light and dark theme"
      onClick={() => {
        const isDark = document.documentElement.classList.contains("dark")
        setTheme(isDark ? "light" : "dark")
      }}
    >
      <SunIcon className="hidden size-4 dark:block" />
      <MoonIcon className="size-4 dark:hidden" />
    </Button>
  )
}
