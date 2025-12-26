"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { generateVSCodeDeepLink, getStoredRedirectPath } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ExternalLink, Download } from "lucide-react"

export function AuthCallbackClient() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [deepLink, setDeepLink] = useState<string>("")
  const [redirectUrl, setRedirectUrl] = useState<string>("")

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading || !initialized) return

    const handleAuthCallback = async () => {
      try {
        if (firebaseUser && user) {
          setStatus("success")
          
          // Create/update profile in Firestore immediately
          // This MUST complete before redirecting to ensure profile is saved
          let isNewUser = false
          try {
            const profile = await createOrUpdateProfile(
              firebaseUser.uid,
              firebaseUser.email || "",
              firebaseUser.displayName,
              firebaseUser.photoURL
            )
            // Check if this is a new user (created just now)
            const createdAt = new Date(profile.created_at)
            const now = new Date()
            const diffMs = now.getTime() - createdAt.getTime()
            isNewUser = diffMs < 60000 // Created within last minute
          } catch {
            // Profile creation failed - don't block the flow
            // User can still use the app, profile sync will retry on next auth
          }

          // Send welcome email for new users (non-blocking)
          if (isNewUser && firebaseUser.email) {
            fetch("/api/email/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
              }),
            }).catch(() => {
              // Non-blocking - welcome email is not critical
            })
          }
          
          // Get ID token for VS Code deep link
          const token = await firebaseUser.getIdToken()
          const vscodeLink = generateVSCodeDeepLink(token)
          setDeepLink(vscodeLink)

          // Check for validated redirect path (security: only allows whitelisted paths)
          const validatedRedirect = getStoredRedirectPath()
          if (validatedRedirect) {
            // Auto-redirect immediately for frictionless flow
            router.push(`/${validatedRedirect}`)
            return
          }

          // Default redirect to dashboard for new users
          router.push("/dashboard")
        } else {
          setStatus("error")
        }
      } catch {
        setStatus("error")
      }
    }

    handleAuthCallback()
  }, [router, firebaseUser, user, authLoading, initialized])

  const handleOpenVSCode = () => {
    window.location.href = deepLink
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p>Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900/50 border-gray-700 max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-400 mb-4">Authentication failed</p>
            <Button onClick={() => (window.location.href = "/login")}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="bg-gray-900/50 border-gray-700 max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <CardTitle className="text-white">Successfully Signed In!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-center">Welcome {user?.user_metadata?.full_name || user?.email}!</p>

          <div className="space-y-3">
            {redirectUrl ? (
              <Button
                onClick={() => (window.location.href = redirectUrl)}
                className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80"
              >
                Continue to {redirectUrl.replace("/", "")}
              </Button>
            ) : (
              <Button onClick={handleOpenVSCode} className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80">
                <ExternalLink className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            )}

            <Button
              onClick={() => (window.location.href = "/dashboard")}
              variant="outline"
              className="w-full border-gray-600 text-white hover:bg-gray-800"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="text-center text-sm text-gray-400">
            <p>Don't have the extension installed?</p>
            <Button variant="link" className="text-[#00d9ff] p-0" onClick={() => (window.location.href = "/install")}>
              <Download className="mr-1 h-3 w-3" />
              VS Code Extension (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
