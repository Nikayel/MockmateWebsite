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
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4703f] mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to account...</p>
      </div>
    </main>
  )
}
