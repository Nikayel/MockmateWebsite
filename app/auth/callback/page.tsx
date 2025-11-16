"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { generateVSCodeDeepLink } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ExternalLink, Download } from "lucide-react"

export default function AuthCallback() {
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
          try {
            console.log("Creating/updating profile for user:", firebaseUser.uid)
            console.log("User email:", firebaseUser.email)
            console.log("User displayName:", firebaseUser.displayName)
            console.log("User photoURL:", firebaseUser.photoURL)
            
            await createOrUpdateProfile(
              firebaseUser.uid,
              firebaseUser.email || "",
              firebaseUser.displayName,
              firebaseUser.photoURL
            )
            
            console.log("Profile created/updated successfully for:", firebaseUser.uid)
          } catch (profileError: any) {
            console.error("Failed to create/update profile:", profileError)
            console.error("Error code:", profileError.code)
            console.error("Error message:", profileError.message)
            console.error("Error stack:", profileError.stack)
            
            // Log specific error types
            if (profileError.code === "permission-denied") {
              console.error("❌ Firestore permission denied!")
              console.error("User UID:", firebaseUser.uid)
              console.error("Make sure Firestore security rules allow writes for authenticated users")
            } else if (profileError.code === "unavailable") {
              console.error("❌ Firestore service unavailable - network issue")
            } else if (profileError.code === "unauthenticated") {
              console.error("❌ User is not authenticated")
            }
            
            // Don't block the flow, but log the error prominently
            // The user can still use the app, but profile won't be saved
          }
          
          // Get ID token for VS Code deep link
          const token = await firebaseUser.getIdToken()
          const vscodeLink = generateVSCodeDeepLink(token)
          setDeepLink(vscodeLink)

          // Check for redirect in localStorage
          const savedRedirect = localStorage.getItem("auth_redirect")
          if (savedRedirect) {
            localStorage.removeItem("auth_redirect")
            // Auto-redirect immediately for frictionless flow
            router.push(`/${savedRedirect}`)
            return
          }

          // Default redirect to dashboard for new users
          router.push("/dashboard")
        } else {
          setStatus("error")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5733] mx-auto mb-4"></div>
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
                className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80"
              >
                Continue to {redirectUrl.replace("/", "")}
              </Button>
            ) : (
              <Button onClick={handleOpenVSCode} className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open MockMate in VS Code
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
            <Button variant="link" className="text-[#ff5733] p-0" onClick={() => (window.location.href = "/install")}>
              <Download className="mr-1 h-3 w-3" />
              Install MockMate Extension
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
