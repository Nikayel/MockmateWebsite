"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, convertFirebaseUser } from "@/lib/auth"
import { Check, Crown, Zap, Star, ArrowRight } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import { User } from "@/lib/types"
import { toast } from "sonner"

export default function UpgradePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const proPricing = getProPricing('website') // Website pricing

  useEffect(() => {
    const loadUser = async () => {
      const firebaseUser = await getCurrentUser()
      if (firebaseUser) {
        const convertedUser = convertFirebaseUser(firebaseUser)
        setUser(convertedUser)
      }
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
      toast.info("Payment integration coming soon! For now, please contact support to upgrade.", {
        duration: 5000,
      })
    } catch (error) {
      console.error("Upgrade error:", error)
      toast.error("Upgrade failed. Please try again.", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
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
                <CardTitle className="text-white">{PRICING_CONFIG.free.name}</CardTitle>
                <div className="text-2xl font-bold text-white">
                  {PRICING_CONFIG.free.priceDisplay}
                  <span className="text-sm font-normal text-gray-400">{PRICING_CONFIG.free.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {PRICING_CONFIG.free.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
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
                  {proPricing.name}
                </CardTitle>
                <div className="text-3xl font-bold text-white">
                  {proPricing.priceDisplay}
                  <span className="text-sm font-normal text-gray-400">{proPricing.period}</span>
                </div>
                <Badge className="mt-2 bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs">
                  💡 VS Code users: $19/month
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {PRICING_CONFIG.pro.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className={index === 0 ? "text-white font-medium" : "text-white"}>{feature}</span>
                  </div>
                ))}
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
                  Upgrade to Pro - {proPricing.priceDisplay}
                  {proPricing.period}
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
