"use client"

/**
 * SprintLabAuthGuard — in-page auth gate for the entire `run/**` branch.
 *
 * UX-SPEC.md §1.2/§1.8: "auth-gated (two layers)". This is layer two, the in-page defense-in-depth,
 * mirroring `components/tutorials/LearnAuthGuard.tsx` line for line (same `useAuth` fields, same
 * `router.replace` redirect, same quiet-placeholder-until-resolved rendering). Layer one is an Edge
 * proxy check keyed off a path predicate (`isLessonWorkspacePath` for Learn); this task does not own
 * `proxy.ts` and does not add the Sprint Labs equivalent there — see the report's Concerns section.
 *
 * Mounted once, in `app/sprint-labs/[workbookId]/run/layout.tsx`, so every screen under `run/**`
 * (standup, board, ticket today; workspace/submit/review/retro/summary in later tasks) is covered by
 * one guard instance rather than each screen re-implementing the check.
 */

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { SparraLoader } from "@/components/brand/SparraLoader"

export function SprintLabAuthGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (initialized && !user) {
      const redirect = encodeURIComponent(pathname ?? "/labs")
      router.replace(`/login?redirect=${redirect}`)
    }
  }, [initialized, user, pathname, router])

  if (!initialized || !user) {
    return (
      <SparraLoader
        className="min-h-screen"
        label={initialized ? "Redirecting to sign in…" : "Loading Sprint Labs…"}
      />
    )
  }

  return <>{children}</>
}
