"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth"
import { Check, Crown, Zap, Star, ArrowRight } from "lucide-react"

export default function UpgradePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  const handleUpgrade = async () => {
    if (!user) {
      window.location.href = "/login?redirect=upgrade"
      return
    }

    setLoading(true)
    try {
      // TODO: Implement Stripe/PayPal payment
      alert("Payment integration coming soon! For now, contact support to upgrade.")
    } catch (error) {
      console.error("Upgrade error:", error)
      alert("Upgrade failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-4">
              <Crown className="mr-1 h-3 w-3" />
              Upgrade to Pro
            </Badge>
            <h1 className="text-4xl font-bold text-white mb-4">Unlock Your Full Potential</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get unlimited access to advanced features and take your interview preparation to the next level.
            </p>
          </div>

          {/* Pricing Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Free Plan */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Free Plan</CardTitle>
                <div className="text-2xl font-bold text-white">
                  $0<span className="text-sm font-normal text-gray-400">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300">10 interview sessions/month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300">Basic coding challenges</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300">Performance feedback</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300">VS Code integration</span>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-yellow-500 text-black font-semibold">
                  <Star className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Crown className="mr-2 h-5 w-5 text-yellow-400" />
                  Pro Plan
                </CardTitle>
                <div className="text-3xl font-bold text-white">
                  $19<span className="text-sm font-normal text-gray-400">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-white font-medium">Unlimited interview sessions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-white">Advanced coding challenges</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-white">System design interviews</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-white">Detailed analytics & insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-white">Priority support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-white">Custom interview scenarios</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              size="lg"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-lg"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Upgrade to Pro - $19/month
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-gray-400 text-sm mt-4">Cancel anytime. No hidden fees. 30-day money-back guarantee.</p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
