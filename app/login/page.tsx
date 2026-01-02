"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Github, Terminal, CheckCircle } from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { useState, useEffect, Suspense } from "react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { motion } from "framer-motion"
import { GridBackground } from "@/components/GridBackground"
import { staggerContainer, staggerItem } from "@/lib/motion"
import Link from "next/link"

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<"idle" | "authenticating" | "creating-profile" | "complete">("idle")
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get("redirect")

  // Check if user is already logged in and redirect them
  // Use useAuth hook instead of duplicate listener to avoid conflicts
  const { firebaseUser, initialized } = useAuth()

  useEffect(() => {
    // Only redirect if auth is initialized and user exists
    if (!initialized || !firebaseUser) return

    // User is already logged in, redirect them
    const savedRedirect = localStorage.getItem("auth_redirect")
    if (savedRedirect) {
      localStorage.removeItem("auth_redirect")
      router.push(`/${savedRedirect}`)
    } else if (redirect) {
      router.push(`/${redirect}`)
    } else {
      router.push("/dashboard")
    }
  }, [router, redirect, firebaseUser, initialized])

  useEffect(() => {
    if (redirect) {
      toast.info("Please sign in to continue", {
        description: `You'll be redirected to ${redirect} after login`,
      })
    }
  }, [redirect])

  // Listen for auth state changes to redirect after successful login
  // Use the auth context instead of duplicate listener
  useEffect(() => {
    if (firebaseUser && authStatus === "authenticating") {
      const handleProfileCreation = async () => {
        // Update status to creating profile
        setAuthStatus("creating-profile")

        // Create/update profile in Firestore immediately
        // This ensures profile exists for both GitHub and Google logins
        try {
          console.log("Creating/updating profile for user:", firebaseUser.uid)

          // Check if this is a new user (first time login)
          const isNewUser = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime

          await createOrUpdateProfile(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName,
            firebaseUser.photoURL
          )

          console.log("Profile created/updated successfully for:", firebaseUser.uid)

          // Send welcome email and create in-app notification for new users
          if (isNewUser && firebaseUser.email) {
            try {
              console.log("Sending welcome notification for new user:", firebaseUser.uid)
              const token = await firebaseUser.getIdToken()
              const welcomeResponse = await fetch("/api/email/welcome", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userId: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                }),
              })

              if (welcomeResponse.ok) {
                const result = await welcomeResponse.json()
                console.log("Welcome notification sent:", result)
              } else {
                console.warn("Welcome notification failed:", await welcomeResponse.text())
              }
            } catch (welcomeError) {
              // Non-blocking - user can still use the app
              console.warn("Failed to send welcome notification:", welcomeError)
            }
          }

          // Mark as complete
          setAuthStatus("complete")

          // User is authenticated, redirect them
          const savedRedirect = localStorage.getItem("auth_redirect")
          if (savedRedirect) {
            localStorage.removeItem("auth_redirect")
            router.push(`/${savedRedirect}`)
          } else if (redirect) {
            router.push(`/${redirect}`)
          } else {
            router.push("/dashboard")
          }
        } catch (profileError: any) {
          console.error("Failed to create/update profile:", profileError)
          console.error("Error code:", profileError.code)
          console.error("Error message:", profileError.message)

          // Only show error toast for critical errors, not for permission issues
          // Permission issues might be temporary and the user can still use the app
          if (profileError.code === "permission-denied") {
            console.warn("Profile creation failed due to permissions - user can still use the app")
            // Don't show error toast for permission issues - they might resolve on retry
          } else {
            // Show error for other issues, but don't block the user
            toast.error("Profile setup encountered an issue", {
              description: "You can still use the app, but some features may be limited"
            })
          }

          // Mark as complete and redirect anyway - don't block user from using the app
          setAuthStatus("complete")

          const savedRedirect = localStorage.getItem("auth_redirect")
          if (savedRedirect) {
            localStorage.removeItem("auth_redirect")
            router.push(`/${savedRedirect}`)
          } else if (redirect) {
            router.push(`/${redirect}`)
          } else {
            router.push("/dashboard")
          }
        }
      }

      handleProfileCreation()
    }
  }, [router, redirect, authStatus, firebaseUser])

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true)
      setAuthStatus("authenticating")
      setAuthProvider("github")

      // Store redirect in localStorage for callback to use
      if (redirect) {
        localStorage.setItem("auth_redirect", redirect)
      } else {
        // Default to dashboard if no redirect specified
        localStorage.setItem("auth_redirect", "dashboard")
      }
      await signInWithGitHub()
      // After popup closes, onAuthStateChanged will handle the redirect
    } catch (error) {
      console.error("Login failed:", error)
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setIsLoading(false)
      setAuthStatus("idle")
      setAuthProvider(null)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setAuthStatus("authenticating")
      setAuthProvider("google")

      // Store redirect in localStorage for callback to use
      if (redirect) {
        localStorage.setItem("auth_redirect", redirect)
      } else {
        // Default to dashboard if no redirect specified
        localStorage.setItem("auth_redirect", "dashboard")
      }
      await signInWithGoogle()
      // After popup closes, onAuthStateChanged will handle the redirect
    } catch (error) {
      console.error("Login failed:", error)
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setIsLoading(false)
      setAuthStatus("idle")
      setAuthProvider(null)
    }
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle grid background like landing page */}
      <GridBackground />

      <Header />

      {/* Clean Loading Overlay */}
      {(authStatus === "authenticating" || authStatus === "creating-profile" || authStatus === "complete") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/98 backdrop-blur-md z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center px-6"
          >
            {/* Minimal spinner */}
            <div className="mb-8 flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-2 border-border rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Terminal className="h-6 w-6 text-accent" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
              {authStatus === "authenticating" && "Signing in..."}
              {authStatus === "creating-profile" && "Setting up your profile..."}
              {authStatus === "complete" && "Welcome!"}
            </h2>

            <p className="text-muted-foreground">
              {authStatus === "complete" ? "Redirecting to dashboard..." : "This will only take a moment"}
            </p>

            {/* Simple progress indicator */}
            <div className="mt-8 flex justify-center gap-2">
              {["authenticating", "creating-profile", "complete"].map((step, i) => (
                <div
                  key={step}
                  className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                    (authStatus === "authenticating" && i === 0) ||
                    (authStatus === "creating-profile" && i <= 1) ||
                    (authStatus === "complete" && i <= 2)
                      ? "bg-accent"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Single focused section - Apple style */}
      <section className="min-h-screen flex items-center justify-center pt-20 pb-16 relative z-10">
        <motion.div
          className="container mx-auto px-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="max-w-md mx-auto">

            {/* Headline - personal touch */}
            <motion.div variants={staggerItem} className="text-center mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Let's get you in
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Ready to crush that next interview?
              </p>

              {/* Personal note - adds character */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 border border-accent/10 text-sm text-muted-foreground">
                <span className="text-accent">~2 min</span>
                <span>daily practice goes a long way</span>
              </div>
            </motion.div>

            {/* Terms + Age Acceptance */}
            <motion.div variants={staggerItem} className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  id="terms-acceptance"
                  checked={hasAcceptedTerms}
                  onCheckedChange={(checked) => setHasAcceptedTerms(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  aria-describedby="terms-description"
                />
                <span id="terms-description" className="text-sm text-muted-foreground leading-relaxed">
                  I confirm I am at least <strong className="text-foreground">16 years old</strong> and agree to the{" "}
                  <Link href="/legal#terms-of-service" className="text-accent hover:underline" target="_blank">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/legal#privacy-policy" className="text-accent hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </motion.div>

            {/* Login buttons - clean and spacious */}
            <motion.div variants={staggerItem} className="space-y-4">

              {/* GitHub */}
              <Button
                onClick={handleGitHubLogin}
                disabled={isLoading || !hasAcceptedTerms}
                className="w-full h-14 bg-foreground hover:bg-foreground/90 text-background text-base font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Continue with GitHub"
              >
                {isLoading && authProvider === "github" ? (
                  <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    <Github className="h-5 w-5 mr-3" />
                    Continue with GitHub
                  </>
                )}
              </Button>

              {/* Google */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading || !hasAcceptedTerms}
                variant="outline"
                className="w-full h-14 bg-transparent hover:bg-secondary/50 text-foreground text-base font-medium rounded-xl border-border hover:border-border/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Continue with Google"
              >
                {isLoading && authProvider === "google" ? (
                  <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </motion.div>

            {/* Minimal footer text */}
            <motion.div variants={staggerItem} className="mt-10 text-center">
              <p className="text-sm text-muted-foreground">
                Free to start. No credit card needed.
              </p>
            </motion.div>

            {/* Trust - super minimal */}
            <motion.div
              variants={staggerItem}
              className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground/60"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                No repo access
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Cancel anytime
              </span>
            </motion.div>

          </div>
        </motion.div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </main>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
