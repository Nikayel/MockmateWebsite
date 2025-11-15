"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, Shield, FolderSyncIcon as Sync, BarChart3, Star, ArrowRight, Terminal, CheckCircle } from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<"idle" | "authenticating" | "creating-profile" | "complete">("idle")
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get("redirect")

  useEffect(() => {
    if (redirect) {
      toast.info("Please sign in to continue", {
        description: `You'll be redirected to ${redirect} after login`,
      })
    }
  }, [redirect])

  // Listen for auth state changes to redirect after successful login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && authStatus === "authenticating") {
        // Update status to creating profile
        setAuthStatus("creating-profile")

        // Create/update profile in Firestore immediately
        // This ensures profile exists for both GitHub and Google logins
        try {
          console.log("Creating/updating profile for user:", user.uid)

          await createOrUpdateProfile(
            user.uid,
            user.email || "",
            user.displayName,
            user.photoURL
          )

          console.log("Profile created/updated successfully for:", user.uid)

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

          // Show error to user but allow them to continue
          toast.error("Profile setup failed", {
            description: "You may need to complete setup later"
          })

          // Mark as complete and redirect anyway
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
    })

    return () => unsubscribe()
  }, [router, redirect, authStatus])

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
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <Card className="bg-gray-900/90 border-gray-700 shadow-2xl">
              <CardContent className="p-8 text-center">
                {/* Animated Logo/Icon */}
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-[#ff5733]/30 border-t-[#ff5733] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Terminal className="h-8 w-8 text-[#ff5733]" />
                    </div>
                  </div>
                </div>
                
                {/* Status Message */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  {authStatus === "authenticating" && "Authenticating..."}
                  {authStatus === "creating-profile" && "Setting up your account..."}
                  {authStatus === "complete" && "Welcome to MockMate!"}
                </h2>
                
                <p className="text-gray-400 mb-6">
                  {authStatus === "authenticating" && `Signing you in with ${authProvider === "github" ? "GitHub" : "Google"}...`}
                  {authStatus === "creating-profile" && "Creating your profile and preparing your dashboard..."}
                  {authStatus === "complete" && "Redirecting you to your dashboard..."}
                </p>
                
                {/* Progress Steps */}
                <div className="space-y-3 mb-6">
                  <div className={`flex items-center space-x-3 ${authStatus !== "idle" ? "opacity-100" : "opacity-50"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      authStatus === "authenticating" || authStatus === "creating-profile" || authStatus === "complete"
                        ? "bg-[#ff5733] text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {authStatus !== "idle" && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <span className="text-sm text-gray-300">Authentication</span>
                  </div>
                  
                  <div className={`flex items-center space-x-3 ${
                    authStatus === "creating-profile" || authStatus === "complete" ? "opacity-100" : "opacity-50"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      authStatus === "creating-profile" || authStatus === "complete"
                        ? "bg-[#ff5733] text-white"
                        : authStatus === "authenticating"
                        ? "bg-[#ff5733]/20 border-2 border-[#ff5733] animate-pulse"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {authStatus === "creating-profile" || authStatus === "complete" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : authStatus === "authenticating" ? (
                        <div className="w-2 h-2 bg-[#ff5733] rounded-full animate-pulse"></div>
                      ) : null}
                    </div>
                    <span className="text-sm text-gray-300">Profile Setup</span>
                  </div>
                  
                  <div className={`flex items-center space-x-3 ${
                    authStatus === "complete" ? "opacity-100" : "opacity-50"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      authStatus === "complete"
                        ? "bg-[#ff5733] text-white"
                        : authStatus === "creating-profile"
                        ? "bg-[#ff5733]/20 border-2 border-[#ff5733] animate-pulse"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {authStatus === "complete" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : authStatus === "creating-profile" ? (
                        <div className="w-2 h-2 bg-[#ff5733] rounded-full animate-pulse"></div>
                      ) : null}
                    </div>
                    <span className="text-sm text-gray-300">Ready to go!</span>
                  </div>
                </div>
                
                {/* Loading Bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r from-[#ff5733] to-[#ff8c69] transition-all duration-500 ${
                      authStatus === "authenticating" ? "w-1/3" :
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

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30 mb-6">Secure Login</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Sign in to
              <span className="text-gradient"> MockMate</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Connect with GitHub to sync your progress, unlock premium features, and get personalized interview
              recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-heading text-white mb-4">Welcome Back</CardTitle>
                <p className="text-gray-400">
                  Sign in to access your MockMate dashboard and continue your interview prep.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* GitHub Login Button */}
                <Button
                  onClick={handleGitHubLogin}
                  disabled={isLoading}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed text-white py-4 text-lg flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading && authProvider === "github" ? (
                    <>
                      <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Github className="h-6 w-6" />
                      <span>Continue with GitHub</span>
                    </>
                  )}
                </Button>

                {/* Google Login Button */}
                <Button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-100/50 disabled:cursor-not-allowed text-gray-900 py-4 text-lg flex items-center justify-center space-x-3 border border-gray-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading && authProvider === "google" ? (
                    <>
                      <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-6 w-6" viewBox="0 0 24 24">
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

                {/* Security Notice */}
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-medium mb-1">Secure & Private</p>
                      <p className="text-gray-400 text-xs">
                        We only access your public GitHub profile. Your code and private repositories remain completely
                        private.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white text-center mb-12">Why Sign In to MockMate?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardContent className="p-6">
                  <Sync className="h-12 w-12 text-[#ff5733] mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-3">Sync Across Devices</h3>
                  <p className="text-gray-400 text-sm">
                    Access your interview progress, settings, and performance history from any VS Code installation.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardContent className="p-6">
                  <BarChart3 className="h-12 w-12 text-[#ff5733] mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-3">Detailed Analytics</h3>
                  <p className="text-gray-400 text-sm">
                    Get comprehensive performance insights, progress tracking, and personalized improvement
                    recommendations.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                <CardContent className="p-6">
                  <Star className="h-12 w-12 text-[#ff5733] mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-3">Premium Features</h3>
                  <p className="text-gray-400 text-sm">
                    Unlock advanced coding challenges, system design interviews, and unlimited practice sessions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-heading font-bold text-white mb-6">
                  Your Personal Interview
                  <span className="text-gradient"> Dashboard</span>
                </h2>
                <p className="text-gray-300 mb-8">
                  Once signed in, you'll have access to a comprehensive dashboard that tracks your interview preparation
                  journey, identifies areas for improvement, and provides personalized recommendations.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Performance Timeline</p>
                      <p className="text-gray-400 text-sm">Track your improvement over time with detailed metrics</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Skill Assessment</p>
                      <p className="text-gray-400 text-sm">Identify strengths and weaknesses across different topics</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-white font-medium">Custom Recommendations</p>
                      <p className="text-gray-400 text-sm">Get personalized practice suggestions based on your goals</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 glass-effect">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-[#ff5733] rounded-full flex items-center justify-center">
                      <Github className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Welcome back, Developer!</p>
                      <p className="text-gray-400 text-sm">Ready to continue your interview prep?</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white text-sm">This Week's Progress</span>
                        <span className="text-[#ff5733] text-sm">7/10 sessions</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-[#ff5733] h-2 rounded-full" style={{ width: "70%" }}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-white">92%</div>
                        <div className="text-gray-400 text-xs">Success Rate</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-white">15m</div>
                        <div className="text-gray-400 text-xs">Avg. Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-6">Ready to Level Up Your Interview Skills?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already using MockMate to ace their technical interviews.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGitHubLogin}
              disabled={isLoading}
              size="lg"
              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg"
            >
              <Github className="mr-2 h-5 w-5" />
              {isLoading ? "Signing in..." : "Sign In with GitHub"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              size="lg"
              variant="outline"
              className="bg-white hover:bg-gray-100 text-gray-900 border-gray-300 px-8 py-4 text-lg"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
              {isLoading ? "Signing in..." : "Sign In with Google"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
