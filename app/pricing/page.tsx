import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Star, Zap, Crown, ArrowRight } from "lucide-react"

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30 mb-6">Simple Pricing</Badge>
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
                  <CardTitle className="text-2xl font-heading text-white mb-2">Free</CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">$0</div>
                  <p className="text-gray-400">Perfect for getting started</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">5 practice sessions per week</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Basic coding challenges</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">AI interviewer feedback</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Performance tracking</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">Install Free Extension</Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="bg-gray-900/50 border-[#ff5733] glass-effect relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-[#ff5733] text-white px-4 py-1">Most Popular</Badge>
                </div>
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Zap className="h-12 w-12 text-[#ff5733]" />
                  </div>
                  <CardTitle className="text-2xl font-heading text-white mb-2">Pro</CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">$9</div>
                  <p className="text-gray-400">per month</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Unlimited practice sessions</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Advanced coding challenges</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">System design interviews</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Detailed analytics & insights</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Custom difficulty levels</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                    Upgrade to Pro
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise Plan */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <Crown className="h-12 w-12 text-yellow-400" />
                  </div>
                  <CardTitle className="text-2xl font-heading text-white mb-2">Enterprise</CardTitle>
                  <div className="text-4xl font-bold text-white mb-2">Custom</div>
                  <p className="text-gray-400">For teams and organizations</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Everything in Pro</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Team management</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Custom interview templates</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">Priority support</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">SSO integration</span>
                    </li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white hover:text-black bg-transparent"
                  >
                    Contact Sales
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
