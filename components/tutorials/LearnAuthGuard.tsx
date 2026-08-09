"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { SparraLoader } from "@/components/brand/SparraLoader"

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
      <SparraLoader
        className="min-h-[40vh]"
        label={initialized ? "Redirecting to sign in…" : undefined}
      />
    )
  }

  return <>{children}</>
}
