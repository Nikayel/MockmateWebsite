import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Star, Zap, Crown, ArrowRight } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import Link from "next/link"

export default function PricingPage() {
  const proPricing = getProPricing('website') // Website pricing
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30 mb-6">Simple Pricing</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Choose Your
              <span className="text-gradient"> Plan</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Start free and upgrade when you're ready. All plans include core interview practice features.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Star className="h-12 w-12 text-gray-400" />
                  </div>
                  <CardTitle className="text-2xl font-heading text-white mb-2">{PRICING_CONFIG.free.name}</CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">{PRICING_CONFIG.free.priceDisplay}</div>
                  <p className="text-gray-400">{PRICING_CONFIG.free.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {PRICING_CONFIG.free.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/install">
                    <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                      {PRICING_CONFIG.free.buttonText}
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-gray-900/50 border-[#00d9ff] glass-effect relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-[#00d9ff] text-white px-4 py-1">Most Popular</Badge>
                </div>
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Zap className="h-12 w-12 text-[#00d9ff]" />
                  </div>
                  <CardTitle className="text-2xl font-heading text-white mb-2">{proPricing.name}</CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">{proPricing.priceDisplay}</div>
                  <p className="text-gray-400">{proPricing.period}</p>
                  <Badge className="mt-2 bg-blue-600/20 text-blue-300 border-blue-600/30">
                    💡 VS Code users: $19/month (install extension)
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {PRICING_CONFIG.pro.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/upgrade">
                    <Button className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                      {PRICING_CONFIG.pro.buttonText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Enterprise Plan */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Crown className="h-12 w-12 text-yellow-400" />
                  </div>
                  <CardTitle className="text-2xl font-heading text-white mb-2">
                    {PRICING_CONFIG.enterprise.name}
                  </CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">{PRICING_CONFIG.enterprise.priceDisplay}</div>
                  <p className="text-gray-400">{PRICING_CONFIG.enterprise.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {PRICING_CONFIG.enterprise.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white hover:text-black bg-transparent"
                  >
                    {PRICING_CONFIG.enterprise.buttonText}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Can I cancel anytime?</h3>
                <p className="text-gray-300">
                  Yes, you can cancel your subscription at any time. You'll continue to have access to Pro features
                  until the end of your billing period.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Is there a free trial?</h3>
                <p className="text-gray-300">
                  The free plan gives you access to core features. You can upgrade to Pro anytime to unlock advanced
                  features and unlimited sessions.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">How does billing work?</h3>
                <p className="text-gray-300">
                  Pro subscriptions are billed monthly. Enterprise plans are custom and can be billed monthly or
                  annually based on your needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
