"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Profile page - redirects to /account
 *
 * The /account page is the canonical user account management page.
 * This redirect maintains backward compatibility with existing links.
 */
export default function ProfilePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the consolidated account page
    router.replace("/account")
  }, [router])

  // Show loading spinner while redirecting
  return (
    <main className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground">Redirecting to account...</p>
      </div>
    </main>
  )
}
