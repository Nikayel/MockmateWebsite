"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, Shield, Brain, TrendingUp, Calendar, Target, Terminal, CheckCircle, Zap } from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { useState, useEffect, Suspense } from "react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<"idle" | "authenticating" | "creating-profile" | "complete">("idle")
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)
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

          await createOrUpdateProfile(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName,
            firebaseUser.photoURL
          )

          console.log("Profile created/updated successfully for:", firebaseUser.uid)

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
    <main className="min-h-screen bg-black">
      <Header />

      {/* Professional Loading Overlay */}
      {(authStatus === "authenticating" || authStatus === "creating-profile" || authStatus === "complete") && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-md w-full mx-auto my-auto">
            <Card className="bg-gray-900/90 border-gray-700 shadow-2xl">
              <CardContent className="p-4 sm:p-6 md:p-8 text-center">
                {/* Animated Logo/Icon */}
                <div className="mb-4 sm:mb-6 flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-[#00d9ff]/30 border-t-[#00d9ff] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Terminal className="h-6 w-6 sm:h-8 sm:w-8 text-[#00d9ff]" />
                    </div>
                  </div>
                </div>

                {/* Status Message */}
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {authStatus === "authenticating" && "Authenticating..."}
                  {authStatus === "creating-profile" && "Setting up your account..."}
                  {authStatus === "complete" && "Welcome to CodeSparring!"}
                </h2>

                <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
                  {authStatus === "authenticating" && `Signing you in with ${authProvider === "github" ? "GitHub" : "Google"}...`}
                  {authStatus === "creating-profile" && "Creating your profile and preparing your dashboard..."}
                  {authStatus === "complete" && "Redirecting you to your dashboard..."}
                </p>

                {/* Progress Steps */}
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2 sm:space-x-3 opacity-100">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-[#00d9ff] text-white">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-300">Authentication</span>
                  </div>

                  <div className={`flex items-center space-x-2 sm:space-x-3 ${authStatus === "creating-profile" || authStatus === "complete" ? "opacity-100" : "opacity-50"
                    }`}>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${authStatus === "creating-profile" || authStatus === "complete"
                        ? "bg-[#00d9ff] text-white"
                        : authStatus === "authenticating"
                          ? "bg-[#00d9ff]/20 border-2 border-[#00d9ff] animate-pulse"
                          : "bg-gray-700 text-gray-400"
                      }`}>
                      {authStatus === "creating-profile" || authStatus === "complete" ? (
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : authStatus === "authenticating" ? (
                        <div className="w-2 h-2 bg-[#00d9ff] rounded-full animate-pulse"></div>
                      ) : null}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-300">Profile Setup</span>
                  </div>

                  <div className={`flex items-center space-x-2 sm:space-x-3 ${authStatus === "complete" ? "opacity-100" : "opacity-50"
                    }`}>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${authStatus === "complete"
                        ? "bg-[#00d9ff] text-white"
                        : authStatus === "creating-profile"
                          ? "bg-[#00d9ff]/20 border-2 border-[#00d9ff] animate-pulse"
                          : "bg-gray-700 text-gray-400"
                      }`}>
                      {authStatus === "complete" ? (
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : authStatus === "creating-profile" ? (
                        <div className="w-2 h-2 bg-[#00d9ff] rounded-full animate-pulse"></div>
                      ) : null}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-300">Ready to go!</span>
                  </div>
                </div>

                {/* Loading Bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-[#00d9ff] to-[#ff8c69] transition-all duration-500 ${authStatus === "authenticating" ? "w-1/3" :
                        authStatus === "creating-profile" ? "w-2/3" :
                          authStatus === "complete" ? "w-full" : "w-0"
                      }`}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Hero & Login Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Value proposition */}
            <div className="max-w-2xl mx-auto text-center lg:text-left">
              <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30 mb-6 inline-flex items-center gap-2">
                <Zap className="h-3 w-3" />
                Science-backed interview prep
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-6">
                Stop grinding.
                <span className="text-gradient"> Start improving.</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                LeetCode gives you problems. We give you a <span className="text-[#00d9ff] font-semibold">system</span>—powered
                by 40 years of cognitive science research on how memory actually works.
              </p>

              {/* Science-backed value props */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {[
                  {
                    icon: Brain,
                    title: "Your skills decay daily",
                    body: "Without review, you forget 70% in 24 hours. We track exactly when."
                  },
                  {
                    icon: Calendar,
                    title: "We schedule your reviews",
                    body: "Spaced repetition means less grinding, better retention."
                  },
                  {
                    icon: TrendingUp,
                    title: "See patterns, not just problems",
                    body: "Track mastery across 15 DSA patterns. Know your weak spots."
                  },
                  {
                    icon: Target,
                    title: "Interview in 2 weeks?",
                    body: "We'll build a day-by-day roadmap optimized for your timeline."
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                    <div className="p-2 rounded-lg bg-[#00d9ff]/10">
                      <item.icon className="h-5 w-5 text-[#00d9ff] flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{item.title}</p>
                      <p className="text-gray-400 text-xs">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Value reminder */}
              <div className="mt-8 p-3 rounded-lg bg-gradient-to-r from-[#00d9ff]/5 to-transparent border border-[#00d9ff]/20">
                <p className="text-sm text-gray-300">
                  <span className="text-[#00d9ff] font-semibold">Built for developers</span> who want to practice smarter, not just harder. Based on proven learning science.
                </p>
              </div>
            </div>

            {/* Right side - Login card */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <Card className="bg-gray-900/70 border-gray-700/80 glass-effect backdrop-blur">
                <CardHeader className="text-center pb-6">
                  <div className="inline-flex items-center justify-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-[#00d9ff]" />
                    <span className="text-[#00d9ff] text-sm font-medium">Free to start</span>
                  </div>
                  <CardTitle className="text-2xl font-heading text-white mb-2">Get started in seconds</CardTitle>
                  <p className="text-gray-400 text-sm">
                    No credit card required. 2 free practice sessions to try it out.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GitHub Login Button */}
                  <Button
                    onClick={handleGitHubLogin}
                    disabled={isLoading}
                    className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed text-white py-5 text-base flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading && authProvider === "github" ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <Github className="h-5 w-5" />
                        <span>Continue with GitHub</span>
                      </>
                    )}
                  </Button>

                  {/* Google Login Button */}
                  <Button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-100/50 disabled:cursor-not-allowed text-gray-900 py-5 text-base flex items-center justify-center space-x-3 border border-gray-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLoading && authProvider === "google" ? (
                      <>
                        <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.10-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
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
                        <span>Continue with Google</span>
                      </>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-gray-900 text-gray-500">Existing user? You'll be signed in automatically</span>
                    </div>
                  </div>

                  {/* Trust indicators */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>No repo access</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Cancel anytime</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Why it works */}
              <div className="mt-4 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
                <p className="text-sm text-gray-400">
                  <span className="text-[#00ff88] font-medium">The science:</span> Spaced repetition improves long-term retention by 90% compared to massed practice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Science Section - Brief and compelling */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30 mb-4">
                Backed by research
              </Badge>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-4">
                Why random grinding doesn't work
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                The Ebbinghaus forgetting curve shows you forget 70% within 24 hours without review.
                CodeSparring schedules your reviews at the exact moment before you forget.
              </p>
            </div>

            {/* Comparison stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-gradient-to-b from-gray-900 to-gray-900/50 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-[#00d9ff] mb-2">70%</div>
                <p className="text-gray-400 text-sm">forgotten in 24h without review</p>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-b from-gray-900 to-gray-900/50 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-[#00ff88] mb-2">90%</div>
                <p className="text-gray-400 text-sm">retained with spaced repetition</p>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-b from-gray-900 to-gray-900/50 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-[#ff8c69] mb-2">50%</div>
                <p className="text-gray-400 text-sm">less study time needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA Section */}
      <section className="py-12 bg-gradient-to-t from-gray-900 to-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-heading font-bold text-white mb-3">
            Ready to practice smarter?
          </h2>
          <p className="text-gray-400 mb-6">
            Start with 2 free sessions. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGitHubLogin}
              disabled={isLoading}
              size="lg"
              className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white px-6"
            >
              <Github className="mr-2 h-5 w-5" />
              {isLoading ? "Signing in..." : "Continue with GitHub"}
            </Button>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              size="lg"
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? "Signing in..." : "Continue with Google"}
            </Button>
          </div>
        </div>
      </section>

      <Footer />
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
