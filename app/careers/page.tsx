import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, Code, Mail, Linkedin } from "lucide-react"

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30 mb-6">We're Hiring</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Join the
              <span className="text-gradient"> Team</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              We're a small team building cool stuff. If you're into AI and want to help developers get better at interviews, let's chat.
            </p>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white text-center mb-12">Open Roles</h2>

            <div className="space-y-6">
              {/* Growth Role */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#00d9ff]/20 rounded-lg">
                      <Rocket className="h-6 w-6 text-[#00d9ff]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-heading text-white">Growth</CardTitle>
                      <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">Equity</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Help us get Skillon in front of more developers. You'll figure out what works, run experiments, and grow our user base. No fluff, just results.
                  </p>
                  <p className="text-gray-400 text-sm">Compensation: Equity (negotiable)</p>
                </CardContent>
              </Card>

              {/* Fullstack Developer Role */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#00d9ff]/20 rounded-lg">
                      <Code className="h-6 w-6 text-[#00d9ff]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-heading text-white">Fullstack Developer</CardTitle>
                      <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">Equity</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Build features across the stack. Bonus points if you've worked with RAG systems or anything AI-related. We ship fast and break things (then fix them).
                  </p>
                  <p className="text-gray-400 text-sm">Compensation: Equity (negotiable)</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Interested?</h2>
            <p className="text-gray-300 mb-8">
              Just drop me a message. No formal applications, no cover letters. Just tell me a bit about yourself and what you're into.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:nikayel@skillon.dev"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Mail className="h-5 w-5" />
                Email me
              </a>
              <a
                href="https://linkedin.com/in/nikayel-ali"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white rounded-lg transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
