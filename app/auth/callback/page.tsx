"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { generateVSCodeDeepLink, convertFirebaseUser } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ExternalLink, Download } from "lucide-react"
import { User } from "@/lib/types"

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [user, setUser] = useState<User | null>(null)
  const [deepLink, setDeepLink] = useState<string>("")
  const [redirectUrl, setRedirectUrl] = useState<string>("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const convertedUser = convertFirebaseUser(firebaseUser)
          setUser(convertedUser)
          
          // Create/update profile in Firestore immediately
          await createOrUpdateProfile(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName,
            firebaseUser.photoURL
          )
          
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

          // Default redirect to account dashboard for new users
          router.push("/account")
        } else {
          setStatus("error")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
        setStatus("error")
      }
    })

    return () => unsubscribe()
  }, [router])

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
              onClick={() => (window.location.href = "/account")}
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
