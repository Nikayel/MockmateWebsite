"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Code,
  Bell,
  CheckCircle,
  Sparkles,
  Zap,
  Globe,
  ArrowRight,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function InstallPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)

    // Simulate API call - replace with actual newsletter signup
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSubscribed(true)
    setIsSubmitting(false)
    toast.success("You're on the list! We'll notify you when the VS Code extension launches.")
  }

  const webFeatures = [
    "Full-featured code editor with syntax highlighting",
    "AI-powered interviewer with real-time feedback",
    "200+ interview scenarios across all difficulty levels",
    "Detailed performance analytics and progress tracking",
    "No installation required - works in any browser",
  ]

  const comingSoonFeatures = [
    "Practice interviews directly in your IDE",
    "Seamless integration with your existing workflow",
    "Offline mode for practice anywhere",
    "Custom workspace configurations",
    "Deep VS Code integration with keybindings",
  ]

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-background via-card to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-neural/20 text-neural border-neural/30 mb-6">
              <Bell className="w-3 h-3 mr-1" />
              Coming Soon
            </Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6">
              VS Code Extension
              <span className="text-gradient block mt-2">Coming Soon</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              We're building a native VS Code extension to bring CodeSparring directly into your development environment.
              Get notified when it launches!
            </p>

            {/* Email Signup Form */}
            {!isSubscribed ? (
              <motion.form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neural focus:ring-1 focus:ring-neural"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-neural hover:bg-neural/80 text-foreground font-semibold px-6 py-3"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                      Subscribing...
                    </span>
                  ) : (
                    <>
                      Notify Me
                      <Bell className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 text-neural mb-8"
              >
                <CheckCircle className="h-6 w-6" />
                <span className="text-lg font-medium">You're on the list!</span>
              </motion.div>
            )}

            {/* CTA to Web Version */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/interview">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/80 text-foreground px-8 py-4 text-lg font-semibold"
                >
                  <Globe className="mr-2 h-5 w-5" />
                  Try Web Version Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Web First Section */}
      <section className="py-16 bg-gradient-to-b from-card to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-4 text-center">
              Why Start with the Web?
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Our web platform gives you the full CodeSparring experience right now, with no installation required.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Web Platform */}
              <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <Globe className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Web Platform</h3>
                      <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">Available Now</Badge>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {webFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/interview" className="block mt-6">
                    <Button className="w-full bg-accent hover:bg-accent/80 text-foreground font-semibold">
                      Start Practicing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* VS Code Extension */}
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-neural/20 rounded-lg flex items-center justify-center">
                      <Code className="h-5 w-5 text-neural" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">VS Code Extension</h3>
                      <Badge className="bg-neural/20 text-neural border-neural/30 text-xs">Coming Soon</Badge>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {comingSoonFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <Sparkles className="h-5 w-5 text-neural flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 p-4 bg-neural/5 border border-neural/20 rounded-lg">
                    <p className="text-sm text-muted-foreground text-center">
                      <Zap className="inline h-4 w-4 text-neural mr-1" />
                      Sign up above to get early access
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-12 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    When will the VS Code extension be available?
                  </h3>
                  <p className="text-muted-foreground">
                    We're targeting Q1 2025 for our initial release. Sign up for notifications to be among the first to try it.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Will my progress sync between web and VS Code?
                  </h3>
                  <p className="text-muted-foreground">
                    Yes! Your account, session history, and progress will seamlessly sync across both platforms.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Is the web version the same as the extension?
                  </h3>
                  <p className="text-muted-foreground">
                    The web version has all the core features including the AI interviewer, code editor, and feedback system. The extension will add deeper IDE integration and offline capabilities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
