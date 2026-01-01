"use client"

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
 * - Authenticated dashboard for logged-in users
 *
 * This allows the marketing content to be fully SSR'd and visible to crawlers,
 * while still showing the dashboard to authenticated users.
 */
export function HomePageClient({ header, footer, marketingContent }: HomePageClientProps) {
  const { user, initialized } = useAuth()

  // While auth is initializing, show the SSR'd marketing content
  // This ensures crawlers always see the marketing page
  if (!initialized) {
    return <>{marketingContent}</>
  }

  // If user is authenticated, show the dashboard
  if (user) {
    return <AuthenticatedDashboard header={header} footer={footer} />
  }

  // Not authenticated - show the SSR'd marketing content
  return <>{marketingContent}</>
}
