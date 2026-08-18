"use client"

/**
 * ThemeToggle — platform-wide light/dark switch (next-themes).
 *
 * ONE button that flips to the other theme, used in the global header and the immersive lab topbar
 * (which hides the header). It was a two-button segmented radiogroup, which spent twice the width to
 * say the same thing and read as a pair of controls that toggle back and forth rather than as one
 * switch.
 *
 * The icon shows the theme you are switching TO, which is the convention every OS-level dark-mode
 * switch uses: a sun means "go light". The `aria-label` says the action for the same reason, so a
 * screen reader announces "Switch to light mode" instead of naming a state the user cannot see.
 *
 * Renders a stable icon and label until mounted so the server HTML and the first client render
 * agree; the real theme lands on the mount effect.
 */

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

type SetTheme = (value: string) => void

/**
 * Switch theme with a GPU-composited View Transitions crossfade.
 *
 * next-themes (0.4.6) applies the `.dark` class in a passive effect that runs
 * after React commits — too late for the View Transition snapshot. So we toggle
 * `.dark` imperatively inside the transition callback (the snapshot then sees
 * the new theme), then call setTheme to sync next-themes' state + storage (its
 * effect re-applies the same class idempotently). Falls back to an instant swap
 * when the API is unavailable or the user prefers reduced motion.
 */
function applyTheme(setTheme: SetTheme, value: string) {
  const root = document.documentElement
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  if (prefersReduced || typeof document.startViewTransition !== "function") {
    setTheme(value)
    return
  }

  document.startViewTransition(() => {
    root.classList.toggle("dark", value === "dark")
    setTheme(value)
  })
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = (theme === "system" ? resolvedTheme : theme) ?? "dark"
  const isDark = current === "dark"
  const next = isDark ? "light" : "dark"

  // Before mount the active theme is unknown, so both renders show the same neutral icon and an
  // action-neutral label. Committing to one here is what produced hydration warnings.
  const Icon = !mounted ? Moon : isDark ? Sun : Moon
  const label = mounted ? `Switch to ${next} mode` : "Toggle color theme"

  return (
    <button
      type="button"
      onClick={() => applyTheme(setTheme, next)}
      aria-label={label}
      title={label}
      className={cn(
        "border-border bg-muted/40 text-muted-foreground hover:text-accent hover:border-accent/40 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}
