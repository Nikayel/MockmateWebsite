"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Github, Terminal, ArrowRight } from "lucide-react"
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
import { getGuestId, confirmGuestSessionMigration, getGuestSessionData } from "@/lib/guest-session"

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Please try again."
  const msg = error.message.toLowerCase()
  if (msg.includes("popup-closed") || msg.includes("cancelled"))
    return "Sign-in was cancelled. Please try again."
  if (msg.includes("account-exists") || msg.includes("already-in-use"))
    return "An account with this email already exists. Try a different sign-in method."
  if (msg.includes("network") || msg.includes("unavailable"))
    return "Network error. Please check your connection and try again."
  if (msg.includes("too-many-requests"))
    return "Too many attempts. Please wait a moment and try again."
  return "Something went wrong. Please try again."
}

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<
    "idle" | "authenticating" | "creating-profile" | "complete"
  >("idle")
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)
  const [email, setEmail] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get("redirect")
  const referralCode = searchParams.get("ref")

  // Store referral code in localStorage for processing after signup
  useEffect(() => {
    if (referralCode) {
      localStorage.setItem("pending_referral_code", referralCode.toUpperCase())
    }
  }, [referralCode])

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
          // Check if this is a new user (first time login)
          const isNewUser =
            firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime

          await createOrUpdateProfile(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName,
            firebaseUser.photoURL
          )

          // Check for pending guest session migration
          const pendingMigration = localStorage.getItem("pending_guest_migration")
          const guestIdFromStorage = getGuestId()

          if (pendingMigration || guestIdFromStorage) {
            try {
              let migrationGuestId = guestIdFromStorage
              let migrationSessionId = null

              // Parse pending migration data if available
              if (pendingMigration) {
                const migrationData = JSON.parse(pendingMigration)
                migrationGuestId = migrationData.guestId || guestIdFromStorage
                migrationSessionId = migrationData.sessionId
              }

              if (migrationGuestId) {
                const token = await firebaseUser.getIdToken()
                const migrationResponse = await fetch("/api/guest-session/migrate", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    guestId: migrationGuestId,
                    sessionId: migrationSessionId,
                  }),
                })

                const migrationResult = await migrationResponse.json()

                if (migrationResponse.ok && migrationResult.migrated > 0) {
                  toast.success("Your trial session has been saved!", {
                    description: "View it in your sessions history.",
                  })
                  confirmGuestSessionMigration()

                  // If there was a specific session, redirect to it
                  const guestSessionData = getGuestSessionData()
                  if (guestSessionData?.sessionId) {
                    localStorage.setItem("auth_redirect", `sessions/${guestSessionData.sessionId}`)
                  }
                }
              }
            } catch {
              // Non-blocking - don't fail login if migration fails
            } finally {
              // Clean up migration markers
              localStorage.removeItem("pending_guest_migration")
            }
          }

          // Send welcome email and create in-app notification for new users
          if (isNewUser && firebaseUser.email) {
            try {
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

              if (!welcomeResponse.ok) {
                // Non-critical - user can still use the app
              }
            } catch {
              // Non-blocking - user can still use the app
            }

            // Process referral code if present (new users only)
            const pendingReferralCode = localStorage.getItem("pending_referral_code")
            if (pendingReferralCode) {
              try {
                const token = await firebaseUser.getIdToken()
                await fetch("/api/referral", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    referralCode: pendingReferralCode,
                  }),
                })
                // Don't show toast - it's not critical to the user experience
              } catch {
                // Non-blocking - user can still use the app
              } finally {
                localStorage.removeItem("pending_referral_code")
              }
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
          // Only show error toast for critical errors, not for permission issues
          // Permission issues might be temporary and the user can still use the app
          if (profileError.code === "permission-denied") {
            // Don't show error toast for permission issues - they might resolve on retry
          } else {
            // Show error for other issues, but don't block the user
            toast.error("Profile setup encountered an issue", {
              description: "You can still use the app, but some features may be limited",
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
      const friendlyMessage = getLoginErrorMessage(error)
      toast.error("Login failed", {
        description: friendlyMessage,
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
      const friendlyMessage = getLoginErrorMessage(error)
      toast.error("Login failed", {
        description: friendlyMessage,
      })
      setIsLoading(false)
      setAuthStatus("idle")
      setAuthProvider(null)
    }
  }

  // Email sign-in is visual-only for now — OAuth (GitHub/Google) is the live path.
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.info("Email sign-in is coming soon", {
      description: "For now, continue with GitHub or Google.",
    })
  }

  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      {/* Subtle grid background like landing page */}
      <GridBackground />

      <Header />

      {/* Clean Loading Overlay */}
      {(authStatus === "authenticating" ||
        authStatus === "creating-profile" ||
        authStatus === "complete") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background/98 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="px-6 text-center"
          >
            {/* Minimal spinner */}
            <div className="mb-8 flex justify-center">
              <div className="relative h-16 w-16">
                <div className="border-border absolute inset-0 rounded-full border-2" />
                <div className="border-t-accent absolute inset-0 animate-spin rounded-full border-2 border-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Terminal className="text-accent h-6 w-6" />
                </div>
              </div>
            </div>

            <h2 className="text-foreground mb-2 text-2xl font-semibold tracking-tight">
              {authStatus === "authenticating" && "Signing in..."}
              {authStatus === "creating-profile" && "Setting up your profile..."}
              {authStatus === "complete" && "Welcome!"}
            </h2>

            <p className="text-muted-foreground">
              {authStatus === "complete"
                ? "Redirecting to dashboard..."
                : "This will only take a moment"}
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
      <section className="relative z-10 flex min-h-screen items-center justify-center pt-20 pb-16">
        <motion.div
          className="container mx-auto px-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="mx-auto max-w-sm">
            {/* Headline */}
            <motion.div variants={staggerItem} className="mb-8">
              <h1 className="text-foreground mb-2 text-3xl font-bold tracking-tight">
                Welcome back
              </h1>
              <p className="text-muted-foreground text-sm">Sign in to sit your next round.</p>
            </motion.div>

            {/* OAuth buttons */}
            <motion.div variants={staggerItem} className="space-y-3">
              {/* GitHub */}
              <Button
                onClick={handleGitHubLogin}
                disabled={isLoading}
                variant="outline"
                className="bg-secondary/40 hover:bg-secondary/60 text-foreground border-border hover:border-border/80 h-12 w-full rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Continue with GitHub"
              >
                {isLoading && authProvider === "github" ? (
                  <div className="border-foreground/30 border-t-foreground h-5 w-5 animate-spin rounded-full border-2" />
                ) : (
                  <>
                    <Github className="mr-2.5 h-5 w-5" />
                    Continue with GitHub
                  </>
                )}
              </Button>

              {/* Google */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="bg-secondary/40 hover:bg-secondary/60 text-foreground border-border hover:border-border/80 h-12 w-full rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Continue with Google"
              >
                {isLoading && authProvider === "google" ? (
                  <div className="border-muted-foreground/30 border-t-muted-foreground h-5 w-5 animate-spin rounded-full border-2" />
                ) : (
                  <>
                    <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </motion.div>

            {/* OR divider */}
            <motion.div variants={staggerItem} className="my-6 flex items-center gap-4">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground/70 text-xs font-medium tracking-[0.2em]">
                OR
              </span>
              <div className="bg-border h-px flex-1" />
            </motion.div>

            {/* Email sign-in */}
            <motion.form variants={staggerItem} onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="text-muted-foreground mb-2 block text-xs font-medium"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  disabled={isLoading}
                  className="bg-secondary/40 border-border focus:border-accent focus:ring-accent/20 text-foreground placeholder:text-muted-foreground/50 h-12 w-full rounded-xl border px-4 text-sm transition outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="bg-accent hover:bg-accent/90 h-12 w-full rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.form>

            {/* Create account */}
            <motion.div variants={staggerItem} className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                New to CodeSparring?{" "}
                <Link href="/login" className="text-accent font-medium hover:underline">
                  Create an account
                </Link>
              </p>
            </motion.div>

            {/* Terms */}
            <motion.div variants={staggerItem} className="mt-4 text-center">
              <p className="text-muted-foreground/60 text-xs">
                By continuing you agree to our{" "}
                <Link
                  href="/legal#terms-of-service"
                  className="hover:text-foreground hover:underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal#privacy-policy"
                  className="hover:text-foreground hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-background flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
