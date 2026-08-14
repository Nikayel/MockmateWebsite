"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { generateVSCodeDeepLink, getStoredRedirectPath, resolveSafeRedirect } from "@/lib/auth"
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
          let shouldSendWelcome = false
          try {
            const profile = await createOrUpdateProfile(
              firebaseUser.uid,
              firebaseUser.email || "",
              firebaseUser.displayName,
              firebaseUser.photoURL
            )
            // Check if welcome email was already sent (more reliable than time-based check)
            shouldSendWelcome = !profile.welcome_email_sent
          } catch {
            // Profile creation failed - don't block the flow
            // User can still use the app, profile sync will retry on next auth
          }

          // The welcome in-app notification is created SERVER-SIDE by
          // /api/email/welcome, called below. It used to also be attempted here
          // through the client SDK, which could never work: firestore.rules sets
          // `allow create: if false` on in_app_notifications, so the write was
          // rejected every time and the failure was swallowed into a console
          // line. Two writers for one notification, one of them structurally
          // impossible, is worse than one that works.

          // Send welcome email for new users (non-blocking, authenticated)
          // Note: If this fails, cron job will retry within 24h
          if (shouldSendWelcome && firebaseUser.email) {
            const logMessage = `[Auth] Attempting to send welcome email for: ${firebaseUser.email}`
            console.log(logMessage)
            // Store in localStorage for debugging even after redirect
            try {
              const existingLogs = JSON.parse(localStorage.getItem("auth_logs") || "[]")
              existingLogs.push({ time: new Date().toISOString(), message: logMessage })
              localStorage.setItem("auth_logs", JSON.stringify(existingLogs.slice(-10))) // Keep last 10
            } catch {}

            const idToken = await firebaseUser.getIdToken()
            fetch("/api/email/welcome", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                userId: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
            })
              .then(async (res) => {
                if (!res.ok) {
                  const errorText = await res.text()
                  const errorMsg = `[Auth] Welcome email HTTP error: ${res.status} ${errorText}`
                  console.error(errorMsg)
                  try {
                    const existingLogs = JSON.parse(localStorage.getItem("auth_logs") || "[]")
                    existingLogs.push({
                      time: new Date().toISOString(),
                      message: errorMsg,
                      error: true,
                    })
                    localStorage.setItem("auth_logs", JSON.stringify(existingLogs.slice(-10)))
                  } catch {}
                  return { success: false, error: `HTTP ${res.status}: ${errorText}` }
                }
                return res.json()
              })
              .then((data) => {
                if (data?.success) {
                  const successMsg = `[Auth] Welcome email sent successfully: ${JSON.stringify(data)}`
                  console.log(successMsg)
                  try {
                    const existingLogs = JSON.parse(localStorage.getItem("auth_logs") || "[]")
                    existingLogs.push({ time: new Date().toISOString(), message: successMsg })
                    localStorage.setItem("auth_logs", JSON.stringify(existingLogs.slice(-10)))
                  } catch {}
                } else {
                  const errorMsg = `[Auth] Welcome email failed: ${data?.error || JSON.stringify(data)}`
                  console.error(errorMsg)
                  try {
                    const existingLogs = JSON.parse(localStorage.getItem("auth_logs") || "[]")
                    existingLogs.push({
                      time: new Date().toISOString(),
                      message: errorMsg,
                      error: true,
                    })
                    localStorage.setItem("auth_logs", JSON.stringify(existingLogs.slice(-10)))
                  } catch {}
                }
              })
              .catch((err) => {
                const errorMsg = `[Auth] Welcome email request failed: ${err.message || err}`
                console.error(errorMsg)
                try {
                  const existingLogs = JSON.parse(localStorage.getItem("auth_logs") || "[]")
                  existingLogs.push({
                    time: new Date().toISOString(),
                    message: errorMsg,
                    error: true,
                  })
                  localStorage.setItem("auth_logs", JSON.stringify(existingLogs.slice(-10)))
                } catch {}
              })
          } else {
            if (!shouldSendWelcome) {
              console.log("[Auth] Welcome email already sent, skipping")
            }
            if (!firebaseUser.email) {
              console.log("[Auth] No email address, skipping welcome email")
            }
          }

          // Get ID token for VS Code deep link
          const token = await firebaseUser.getIdToken()
          const vscodeLink = generateVSCodeDeepLink(token)
          setDeepLink(vscodeLink)

          // Check for validated redirect path (security: only allows whitelisted paths).
          // getStoredRedirectPath already returns the normalized leading-slash form,
          // so it is pushed verbatim. Prepending a slash here is what produced the
          // protocol-relative "//learn/..." that browsers resolved as a remote host.
          const validatedRedirect = getStoredRedirectPath()
          if (validatedRedirect) {
            // Auto-redirect immediately for frictionless flow
            router.push(resolveSafeRedirect(validatedRedirect))
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
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-foreground text-center">
          <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p>Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="bg-card/50 border-border max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4 text-red-400">Authentication failed</p>
            <Button onClick={() => (window.location.href = "/login")}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="bg-card/50 border-border max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400" />
          <CardTitle className="text-foreground">Successfully Signed In!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            Welcome {user?.user_metadata?.full_name || user?.email}!
          </p>

          <div className="space-y-3">
            {redirectUrl ? (
              <Button
                onClick={() => (window.location.href = redirectUrl)}
                className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
              >
                Continue to {redirectUrl.replace("/", "")}
              </Button>
            ) : (
              <Button
                onClick={handleOpenVSCode}
                className="bg-accent text-accent-foreground hover:bg-accent/90 w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            )}

            <Button
              onClick={() => (window.location.href = "/dashboard")}
              variant="outline"
              className="border-border text-foreground hover:bg-muted w-full"
            >
              Go to Dashboard
            </Button>
          </div>

          <div className="text-muted-foreground text-center text-sm">
            <p>Don't have the extension installed?</p>
            <Button
              variant="link"
              className="text-accent-strong p-0"
              onClick={() => (window.location.href = "/install")}
            >
              <Download className="mr-1 h-3 w-3" />
              VS Code Extension (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
