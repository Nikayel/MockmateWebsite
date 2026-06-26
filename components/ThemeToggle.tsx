"use client"

/**
 * ThemeToggle — platform-wide light/dark switch (next-themes).
 *
 * A compact Sun/Moon segmented control used in the global header and the
 * immersive lab topbar (which hides the header). Styled with the app's semantic
 * tokens so it reads correctly in both themes. Renders a stable placeholder
 * until mounted to avoid a hydration mismatch on the active theme.
 */

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = (theme === "system" ? resolvedTheme : theme) ?? "dark"

  const options = [
    { value: "light", icon: Sun, label: "Light mode" },
    { value: "dark", icon: Moon, label: "Dark mode" },
  ] as const

  return (
    <div
      className={cn(
        "border-border bg-muted/40 inline-flex items-center gap-0.5 rounded-md border p-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Color theme"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = mounted && current === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded transition-colors",
              active
                ? "bg-background text-accent shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
