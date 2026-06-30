"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

/**
 * In-page auth guard for the Python tutorial (defense-in-depth behind the Edge proxy gate in
 * `proxy.ts`). Redirects to `/login` once auth has initialized and there is no user — progress
 * requires a real account. Renders a quiet placeholder until auth resolves.
 */
export function LearnAuthGuard({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (initialized && !user) {
      const redirect = encodeURIComponent(pathname ?? "/learn/python")
      router.replace(`/login?redirect=${redirect}`)
    }
  }, [initialized, user, pathname, router])

  if (!initialized || !user) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        {initialized ? "Redirecting to sign in…" : "Loading…"}
      </div>
    )
  }

  return <>{children}</>
}
