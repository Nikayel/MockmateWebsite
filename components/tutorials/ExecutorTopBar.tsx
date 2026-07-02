"use client"

import Link from "next/link"
import { ChevronRight, SquareTerminal, X } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useAuth } from "@/lib/auth-context"

/**
 * The Python Executor's slim contextual bar (HANDOFF §1) — replaces the full 6-item site nav on a
 * focused tool. Left: a CodeSparring › Learn Python › Executor breadcrumb (chevron separators, a
 * terminal glyph on the active crumb) + a Python-version chip. Right: theme toggle · Exit (back to
 * Learn Python) · an avatar when signed in. 52px, glassy, hairline bottom border.
 */
export function ExecutorTopBar() {
  const { user } = useAuth()
  const label = user?.user_metadata?.full_name || user?.email || ""
  const initial = label.trim().charAt(0).toUpperCase()

  return (
    <header className="border-border bg-background/80 flex h-[52px] shrink-0 items-center gap-2 border-b px-3 backdrop-blur-md sm:px-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <Link
          href="/"
          className="text-foreground text-sm font-semibold tracking-tight whitespace-nowrap"
        >
          CodeSparring
        </Link>
        <ChevronRight
          className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <Link
          href="/learn/python"
          className="text-muted-foreground hover:text-foreground hidden text-sm whitespace-nowrap transition-colors sm:inline"
        >
          Learn Python
        </Link>
        <ChevronRight
          className="text-muted-foreground/50 hidden h-3.5 w-3.5 shrink-0 sm:block"
          aria-hidden="true"
        />
        <span
          className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap"
          aria-current="page"
        >
          <SquareTerminal className="text-accent h-4 w-4" aria-hidden="true" />
          Executor
        </span>
      </nav>

      <span className="border-border text-muted-foreground ml-2 hidden rounded-full border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap sm:inline">
        Python 3.12
      </span>

      {/* Right cluster */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <Link
          href="/learn/python"
          aria-label="Exit to Learn Python"
          title="Exit to Learn Python"
          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-accent/50 flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="h-4 w-4" />
        </Link>
        {initial && (
          <>
            <span className="bg-border h-5 w-px" aria-hidden="true" />
            <Link
              href="/account"
              aria-label="Account"
              title={label}
              className="bg-accent/15 text-accent hover:bg-accent/25 focus-visible:ring-accent/50 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {initial}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
