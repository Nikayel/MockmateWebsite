"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AuthenticatedDashboard } from "./AuthenticatedDashboard"

interface HomePageClientProps {
  header: React.ReactNode
  footer: React.ReactNode
  marketingContent: React.ReactNode
}

/**
 * Client component that handles auth state and conditionally renders:
 * - Marketing content (SSR'd) for non-authenticated users
 * - Redirects authenticated users to /dashboard
 *
 * This allows the marketing content to be fully SSR'd and visible to crawlers,
 * while redirecting authenticated users to the dashboard.
 */
export function HomePageClient({ header, footer, marketingContent }: HomePageClientProps) {
  const { user, initialized } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (initialized && user) {
      router.push("/dashboard")
    }
  }, [user, initialized, router])

  // While auth is initializing, show the SSR'd marketing content
  // This ensures crawlers always see the marketing page
  if (!initialized) {
    return <>{marketingContent}</>
  }

  // If user is authenticated, show loading while redirecting
  if (user) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
      </main>
    )
  }

  // Not authenticated - show the SSR'd marketing content
  return <>{marketingContent}</>
}
