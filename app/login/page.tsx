"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Github, Shield, FolderSyncIcon as Sync, BarChart3, Star, ArrowRight } from "lucide-react"
import { signInWithGitHub } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
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

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true)
      const result = await signInWithGitHub(redirect || undefined)
      
      // Create/update profile in Firestore
      if (result.user) {
        await createOrUpdateProfile(
          result.user.uid,
          result.user.email || "",
          result.user.displayName,
          result.user.photoURL
        )
      }

      // Redirect after successful login
      if (redirect) {
        router.push(`/${redirect}`)
      } else {
        router.push("/account")
      }
    } catch (error) {
      console.error("Login failed:", error)
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

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
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 text-lg flex items-center justify-center space-x-3"
                >
                  <Github className="h-6 w-6" />
                  <span>{isLoading ? "Signing in..." : "Continue with GitHub"}</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-400">Secure authentication via GitHub OAuth</span>
                  </div>
                </div>

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
        </div>
      </section>

      <Footer />
    </main>
  )
}
