import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, FileText, Eye, Lock } from "lucide-react"

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30 mb-6">Legal Information</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Legal &<span className="text-gradient"> Privacy</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Your privacy and security are our top priorities. Learn about our policies and terms.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Sections */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Privacy Policy */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <Eye className="h-6 w-6 text-[#ff5733]" />
                  <span>Privacy Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <p>
                  <strong>Last updated:</strong> January 2024
                </p>
                <p>
                  MockMate respects your privacy and is committed to protecting your personal data. This privacy policy
                  explains how we collect, use, and protect your information when you use our VS Code extension.
                </p>
                <h4 className="text-white font-semibold mt-6 mb-3">Information We Collect</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Code practice sessions and performance metrics</li>
                  <li>Usage analytics to improve our service</li>
                  <li>Account information (email, GitHub profile)</li>
                  <li>Technical data for debugging and optimization</li>
                </ul>
                <h4 className="text-white font-semibold mt-6 mb-3">How We Use Your Information</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Provide personalized interview practice experiences</li>
                  <li>Generate performance analytics and feedback</li>
                  <li>Improve our AI models and features</li>
                  <li>Communicate important updates and features</li>
                </ul>
                <h4 className="text-white font-semibold mt-6 mb-3">Data Security</h4>
                <p>
                  We implement industry-standard security measures to protect your data. All code sessions are encrypted
                  in transit and at rest. We never share your personal code or interview data with third parties.
                </p>
              </CardContent>
            </Card>

            {/* Terms of Service */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-[#ff5733]" />
                  <span>Terms of Service</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <p>
                  <strong>Last updated:</strong> January 2024
                </p>
                <p>
                  By using MockMate, you agree to these terms of service. Please read them carefully before using our
                  extension.
                </p>
                <h4 className="text-white font-semibold mt-6 mb-3">Acceptable Use</h4>
                <ul className="list-disc list-inside space-y-2">
                  <li>Use MockMate for legitimate interview practice purposes</li>
                  <li>Do not attempt to reverse engineer or exploit our AI systems</li>
                  <li>Respect intellectual property rights</li>
                  <li>Do not use the service for any illegal activities</li>
                </ul>
                <h4 className="text-white font-semibold mt-6 mb-3">Service Availability</h4>
                <p>
                  We strive to maintain high availability but cannot guarantee 100% uptime. We may perform maintenance
                  that temporarily affects service availability.
                </p>
                <h4 className="text-white font-semibold mt-6 mb-3">Limitation of Liability</h4>
                <p>
                  MockMate is provided "as is" without warranties. We are not liable for any damages arising from the
                  use of our service.
                </p>
              </CardContent>
            </Card>

            {/* Data Processing */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <Lock className="h-6 w-6 text-[#ff5733]" />
                  <span>Data Processing Agreement</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <p>
                  <strong>Last updated:</strong> January 2024
                </p>
                <p>
                  For enterprise customers, we provide a comprehensive Data Processing Agreement (DPA) that outlines how
                  we handle your organization's data.
                </p>
                <h4 className="text-white font-semibold mt-6 mb-3">GDPR Compliance</h4>
                <p>
                  MockMate is fully compliant with GDPR regulations. EU users have the right to access, rectify, or
                  delete their personal data at any time.
                </p>
                <h4 className="text-white font-semibold mt-6 mb-3">Data Retention</h4>
                <p>
                  We retain user data for as long as necessary to provide our services. Users can request data deletion
                  at any time through their account settings.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="bg-gray-900/50 border-gray-700 glass-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-[#ff5733]" />
                  <span>Contact & Compliance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <p>
                  If you have any questions about our legal policies or need to exercise your data rights, please
                  contact us:
                </p>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p>
                    <strong>Email:</strong> legal@mockmate.dev
                  </p>
                  <p>
                    <strong>Data Protection Officer:</strong> privacy@mockmate.dev
                  </p>
                  <p>
                    <strong>Response Time:</strong> Within 72 hours for privacy requests
                  </p>
                </div>
                <p className="text-sm text-gray-400 mt-6">
                  These policies may be updated from time to time. We will notify users of significant changes via email
                  or through the extension interface.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
