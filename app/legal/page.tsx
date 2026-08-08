import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  FileText,
  Eye,
  Lock,
  Globe,
  Bell,
  Cookie,
  Scale,
  Users,
  Database,
  AlertTriangle,
} from "lucide-react"

export const metadata = {
  title: "Legal & Privacy - CodeSparring",
  description:
    "Privacy Policy, Terms of Service, and legal information for CodeSparring AI-powered interview practice platform.",
}

export default function LegalPage() {
  const lastUpdated = "December 2025"
  const effectiveDate = "December 27, 2025"

  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-black via-gray-900 to-black pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 border-[#c4703f]/30 bg-[#c4703f]/20 text-[#c4703f]">
              Legal Information
            </Badge>
            <h1 className="font-heading mb-6 text-4xl font-bold text-white md:text-6xl">
              Legal &<span className="text-gradient"> Privacy</span>
            </h1>
            <p className="mx-auto mb-4 max-w-2xl text-xl text-gray-300">
              Your privacy and security are our top priorities. This page contains our complete
              legal policies.
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated} | Effective: {effectiveDate}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="border-y border-gray-800 bg-gray-900/50 py-6">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <nav className="flex flex-wrap justify-center gap-4 text-sm">
              <a href="#privacy-policy" className="text-[#c4703f] hover:underline">
                Privacy Policy
              </a>
              <span className="text-gray-600">|</span>
              <a href="#terms-of-service" className="text-[#c4703f] hover:underline">
                Terms of Service
              </a>
              <span className="text-gray-600">|</span>
              <a href="#cookie-policy" className="text-[#c4703f] hover:underline">
                Cookie Policy
              </a>
              <span className="text-gray-600">|</span>
              <a href="#data-processing" className="text-[#c4703f] hover:underline">
                Data Processing
              </a>
              <span className="text-gray-600">|</span>
              <a href="#contact" className="text-[#c4703f] hover:underline">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </section>

      {/* Legal Sections */}
      <section className="bg-gradient-to-b from-gray-900 to-black py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl space-y-12">
            <Card
              id="privacy-policy"
              className="glass-effect scroll-mt-24 border-gray-700 bg-gray-900/50"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Eye className="h-6 w-6 text-[#c4703f]" />
                  <span>Privacy Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-300">
                <p className="text-sm text-gray-400">
                  <strong>Last updated:</strong> {lastUpdated} | <strong>Effective:</strong>{" "}
                  {effectiveDate}
                </p>

                <div className="rounded-lg border border-[#c4703f]/20 bg-[#c4703f]/10 p-4">
                  <p className="text-sm text-[#c4703f]">
                    <strong>Summary:</strong> We collect data to provide AI-powered interview
                    practice. Your code and conversations are processed by AI providers to generate
                    feedback. We never sell your data. You can delete your account and all data at
                    any time.
                  </p>
                </div>

                <p>
                  CodeSparring (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your
                  privacy and is committed to protecting your personal data. This privacy policy
                  explains how we collect, use, store, and protect your information when you use our
                  AI-powered technical interview practice platform.
                </p>

                {/* Information We Collect */}
                <div>
                  <h4 className="mt-6 mb-3 flex items-center font-semibold text-white">
                    <Database className="mr-2 h-4 w-4 text-[#c4703f]" />
                    Information We Collect
                  </h4>

                  <h5 className="mt-4 mb-2 font-medium text-white">Account Information</h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>Email address (from OAuth provider)</li>
                    <li>Display name and profile picture (from GitHub/Google)</li>
                    <li>Account creation date</li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">Interview & Practice Data</h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>Code you write during practice sessions</li>
                    <li>Conversations with our AI interviewer</li>
                    <li>Performance scores and feedback</li>
                    <li>Session duration and completion status</li>
                    <li>Programming languages used</li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">Payment Information</h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>Payment transactions are processed by Stripe</li>
                    <li>
                      We store: subscription status, billing dates, payment history (amount, date,
                      status)
                    </li>
                    <li>
                      We do NOT store: full credit card numbers, CVV, or sensitive payment details
                    </li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">
                    Voice & Audio Data (only when you turn on voice mode)
                  </h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>
                      Microphone audio captured while you hold or toggle the record control. Your
                      browser asks for microphone permission first, and nothing is captured until
                      you grant it and start a recording.
                    </li>
                    <li>
                      Audio is streamed live to Deepgram over an encrypted connection for real-time
                      transcription. We do not record it to a file, and neither we nor Deepgram
                      retain the audio after the connection closes.
                    </li>
                    <li>
                      The resulting text transcript becomes an ordinary message in your interview
                      conversation. It is stored with that session, sent to our AI providers like
                      any typed message, and follows the interview session retention period below.
                    </li>
                    <li>
                      Voice mode is entirely optional. If you never enable it, no audio ever leaves
                      your device.
                    </li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">Technical Data</h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>IP address (for security and rate limiting)</li>
                    <li>Browser type and device information</li>
                    <li>Usage analytics (with your consent)</li>
                  </ul>
                </div>

                {/* How We Use AI Providers */}
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <h4 className="mb-3 flex items-center font-semibold text-yellow-400">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Important: How We Use AI Providers
                  </h4>
                  <p className="mb-3 text-sm">
                    To provide AI-powered interview feedback, your code and conversation data is
                    sent to third-party AI providers for processing. This is essential to how our
                    service works.
                  </p>
                  <p className="mb-3 text-sm">
                    <strong className="text-white">What is sent to AI providers:</strong>
                  </p>
                  <ul className="mb-3 list-inside list-disc space-y-1 text-sm">
                    <li>Code you write during sessions</li>
                    <li>Your conversation messages with the AI interviewer</li>
                    <li>Problem context and the scenario you selected</li>
                    <li>
                      Your first name and email address, so the interviewer can address you
                      naturally
                    </li>
                    <li>
                      Your subscription tier, sessions completed, and stated skill level, so
                      difficulty can be calibrated
                    </li>
                    <li>Audio transcripts, when you use voice mode</li>
                  </ul>
                  <p className="mb-3 text-sm">
                    <strong className="text-white">What is NOT sent:</strong>
                  </p>
                  <ul className="mb-3 list-inside list-disc space-y-1 text-sm">
                    <li>Payment or card information</li>
                    <li>Your account password (we never hold one, sign-in is OAuth only)</li>
                    <li>Session history from other users</li>
                  </ul>
                  <p className="text-sm text-yellow-300">
                    <strong>AI providers do NOT use your data to train their models.</strong> Data
                    is used solely for generating your interview responses and feedback in
                    real-time.
                  </p>
                </div>

                {/* Third-Party Service Providers */}
                <div>
                  <h4 className="mt-6 mb-3 flex items-center font-semibold text-white">
                    <Globe className="mr-2 h-4 w-4 text-[#c4703f]" />
                    Third-Party Service Providers
                  </h4>
                  <p className="mb-4 text-sm">
                    We work with trusted third-party services to operate our platform. Each provider
                    has their own privacy policy and data protection measures:
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="py-2 text-left text-white">Provider</th>
                          <th className="py-2 text-left text-white">Purpose</th>
                          <th className="py-2 text-left text-white">Data Shared</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-400">
                        <tr className="border-b border-gray-800">
                          <td className="py-2">OpenAI</td>
                          <td className="py-2">
                            Primary AI provider (interviewer, feedback, embeddings)
                          </td>
                          <td className="py-2">Code, conversations, first name, email</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">DeepSeek</td>
                          <td className="py-2">AI fallback provider</td>
                          <td className="py-2">Code, conversations, first name, email</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Google Gemini</td>
                          <td className="py-2">AI fallback provider & embeddings</td>
                          <td className="py-2">Code, conversations, first name, email</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Anthropic Claude</td>
                          <td className="py-2">AI fallback provider</td>
                          <td className="py-2">Code, conversations, first name, email</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Stripe</td>
                          <td className="py-2">Payment processing</td>
                          <td className="py-2">Payment details, email</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Firebase (Google)</td>
                          <td className="py-2">Authentication & database</td>
                          <td className="py-2">Account data, sessions</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Deepgram</td>
                          <td className="py-2">Voice transcription</td>
                          <td className="py-2">Audio (if voice enabled)</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Brevo</td>
                          <td className="py-2">Email notifications</td>
                          <td className="py-2">Email, name</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Pinecone</td>
                          <td className="py-2">AI memory/context</td>
                          <td className="py-2">Anonymized embeddings</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Vercel</td>
                          <td className="py-2">Hosting & analytics</td>
                          <td className="py-2">Usage data (with consent)</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Sentry</td>
                          <td className="py-2">Error and crash reporting</td>
                          <td className="py-2">Error reports, request metadata, user ID</td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-2">Upstash (Redis)</td>
                          <td className="py-2">Rate limiting and abuse prevention</td>
                          <td className="py-2">IP address, request counts</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Data Retention */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Data Retention Periods</h4>
                  <p className="mb-3 text-sm">We retain your data for the following periods:</p>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      <strong className="text-white">Account data:</strong> Until you delete your
                      account
                    </li>
                    <li>
                      <strong className="text-white">Interview sessions:</strong> 2 years from
                      creation, or until account deletion
                    </li>
                    <li>
                      <strong className="text-white">Voice audio:</strong> Not retained. Microphone
                      audio is streamed for transcription and discarded as it is processed; only the
                      text transcript is kept, and it follows the interview session period above
                    </li>
                    <li>
                      <strong className="text-white">Payment records:</strong> 7 years (required for
                      tax/legal compliance)
                    </li>
                    <li>
                      <strong className="text-white">Analytics data:</strong> 26 months (anonymized
                      after 14 months)
                    </li>
                    <li>
                      <strong className="text-white">Security logs:</strong> 90 days
                    </li>
                    <li>
                      <strong className="text-white">Deleted account data:</strong> Permanently
                      purged within 30 days
                    </li>
                  </ul>
                </div>

                {/* International Data Transfers */}
                <div>
                  <h4 className="mt-6 mb-3 flex items-center font-semibold text-white">
                    <Globe className="mr-2 h-4 w-4 text-[#c4703f]" />
                    International Data Transfers
                  </h4>
                  <p className="mb-3 text-sm">
                    Our services are hosted in the United States. If you are accessing our services
                    from the European Union, United Kingdom, or other regions with data protection
                    laws, please note that your data will be transferred to and processed in the
                    United States.
                  </p>
                  <p className="text-sm">
                    We ensure appropriate safeguards are in place for international transfers,
                    including:
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                    <li>Standard Contractual Clauses (SCCs) with our processors</li>
                    <li>Data Processing Agreements with all third-party providers</li>
                    <li>Encryption of data in transit and at rest</li>
                  </ul>
                </div>

                {/* How We Use Your Information */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">
                    How We Use Your Information
                  </h4>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      <strong className="text-white">Provide our service:</strong> Deliver
                      AI-powered interview practice and personalized feedback
                    </li>
                    <li>
                      <strong className="text-white">Improve your experience:</strong> Track your
                      progress and recommend relevant practice problems
                    </li>
                    <li>
                      <strong className="text-white">Process payments:</strong> Handle subscription
                      billing through Stripe
                    </li>
                    <li>
                      <strong className="text-white">Send notifications:</strong> Email reminders,
                      practice suggestions, and account updates (with your consent)
                    </li>
                    <li>
                      <strong className="text-white">Ensure security:</strong> Prevent fraud, abuse,
                      and unauthorized access
                    </li>
                    <li>
                      <strong className="text-white">Legal compliance:</strong> Meet our legal and
                      regulatory obligations
                    </li>
                  </ul>
                </div>

                {/* What We Do NOT Do */}
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <h4 className="mb-3 font-semibold text-green-400">What We Do NOT Do</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>We do NOT sell your personal data to anyone</li>
                    <li>We do NOT share your data with advertisers</li>
                    <li>We do NOT use your code to train AI models</li>
                    <li>
                      We do NOT access your code for any purpose other than providing our service
                    </li>
                    <li>We do NOT store sensitive payment details (handled by Stripe)</li>
                  </ul>
                </div>

                {/* Data Security */}
                <div>
                  <h4 className="mt-6 mb-3 flex items-center font-semibold text-white">
                    <Lock className="mr-2 h-4 w-4 text-[#c4703f]" />
                    Data Security
                  </h4>
                  <p className="mb-3 text-sm">We implement industry-standard security measures:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>TLS 1.3 encryption for all data in transit</li>
                    <li>AES-256 encryption for data at rest</li>
                    <li>OAuth 2.0 secure authentication (no password storage)</li>
                    <li>Regular security audits and vulnerability assessments</li>
                    <li>Rate limiting and DDoS protection</li>
                    <li>Sandboxed code execution environments</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card
              id="terms-of-service"
              className="glass-effect scroll-mt-24 border-gray-700 bg-gray-900/50"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <FileText className="h-6 w-6 text-[#c4703f]" />
                  <span>Terms of Service</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-300">
                <p className="text-sm text-gray-400">
                  <strong>Last updated:</strong> {lastUpdated} | <strong>Effective:</strong>{" "}
                  {effectiveDate}
                </p>

                <p>
                  By accessing or using CodeSparring (&quot;the Service&quot;), you agree to be
                  bound by these Terms of Service. If you do not agree to these terms, please do not
                  use our Service.
                </p>

                {/* Age Requirement */}
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <h4 className="mb-2 flex items-center font-semibold text-red-400">
                    <Users className="mr-2 h-4 w-4" />
                    Age Requirement
                  </h4>
                  <p className="text-sm">
                    <strong>You must be at least 16 years old to use CodeSparring.</strong> By
                    creating an account, you confirm that you are at least 16 years of age. If you
                    are under 18, you confirm that you have your parent or guardian&apos;s
                    permission to use this Service.
                  </p>
                  <p className="mt-2 text-sm">
                    We do not knowingly collect personal information from children under 16. If we
                    discover that a child under 16 has provided us with personal information, we
                    will delete it immediately.
                  </p>
                </div>

                {/* Account Terms */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Account Terms</h4>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>You are responsible for maintaining the security of your account</li>
                    <li>You must provide accurate information when creating your account</li>
                    <li>You may not share your account with others</li>
                    <li>You are responsible for all activity that occurs under your account</li>
                    <li>You must notify us immediately of any unauthorized access</li>
                  </ul>
                </div>

                {/* Acceptable Use */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Acceptable Use</h4>
                  <p className="mb-3 text-sm">You agree NOT to:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>Use the Service for any illegal purpose or to violate any laws</li>
                    <li>Attempt to reverse engineer, decompile, or exploit our AI systems</li>
                    <li>Submit malicious code, viruses, or harmful content</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Use automated tools to scrape or extract data from the Service</li>
                    <li>Resell, redistribute, or commercialize the Service without permission</li>
                    <li>Harass, abuse, or harm others through the Service</li>
                    <li>Violate the intellectual property rights of others</li>
                  </ul>
                </div>

                {/* Intellectual Property */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Intellectual Property</h4>
                  <p className="mb-3 text-sm">
                    <strong className="text-white">Your Code:</strong> You retain all ownership
                    rights to the code you write during practice sessions. We do not claim any
                    intellectual property rights over your code.
                  </p>
                  <p className="mb-3 text-sm">
                    <strong className="text-white">Our Service:</strong> CodeSparring, including our
                    platform, AI systems, problem sets, and content, is protected by intellectual
                    property laws. You may not copy, modify, or distribute our materials without
                    permission.
                  </p>
                  <p className="text-sm">
                    <strong className="text-white">Feedback:</strong> If you provide suggestions or
                    feedback about our Service, we may use it to improve our products without any
                    obligation to you.
                  </p>
                </div>

                {/* Subscription & Billing */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Subscription & Billing</h4>

                  <h5 className="mt-4 mb-2 font-medium text-white">Free Tier</h5>
                  <p className="text-sm">
                    Our free tier provides limited access to the Service at no cost. Free tier
                    limitations may change at any time.
                  </p>

                  <h5 className="mt-4 mb-2 font-medium text-white">
                    Pro Monthly (a recurring subscription)
                  </h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>Billed monthly in advance</li>
                    <li>
                      <strong className="text-yellow-400">Automatic Renewal:</strong> Pro Monthly
                      renews automatically at the end of each billing month unless you cancel before
                      the renewal date. You will be charged using the payment method on file.
                    </li>
                    <li>Prices are in USD and exclude applicable taxes</li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">
                    Pro Yearly (a one-time purchase, not a subscription)
                  </h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>
                      <strong className="text-white">Pro Yearly does not renew.</strong> It is a
                      single charge that grants 12 months of Pro access from the date of purchase.
                    </li>
                    <li>
                      We do not store a recurring billing arrangement for it and we will never
                      charge the card again on our own. There is nothing to cancel, and nothing to
                      forget to cancel.
                    </li>
                    <li>
                      When the 12 months are up, your account returns to the Free tier. To continue
                      on Pro you purchase again, by choice, at whatever the price is then.
                    </li>
                    <li>Prices are in USD and exclude applicable taxes</li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">Cancellation</h5>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>
                      <strong className="text-white">Pro Monthly:</strong> cancel at any time from
                      your Account Settings, which opens the Stripe customer portal. You keep Pro
                      access until the end of the month you have already paid for.
                    </li>
                    <li>
                      <strong className="text-white">Pro Yearly:</strong> there is no recurring
                      charge to cancel. Your 12 months of access run to their end date either way.
                      If you want a refund inside the first 30 days, see the refund policy below.
                    </li>
                    <li>We do not provide prorated refunds for partial months</li>
                  </ul>

                  <h5 className="mt-4 mb-2 font-medium text-white">Refund Policy</h5>
                  <p className="text-sm">
                    We offer a <strong className="text-white">30-day money-back guarantee</strong>{" "}
                    on all new subscriptions. If you&apos;re not satisfied with CodeSparring within
                    the first 30 days of your initial purchase, contact support@codesparring.dev for
                    a full refund—no questions asked.
                  </p>
                </div>

                {/* Service Availability */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Service Availability</h4>
                  <p className="text-sm">
                    We strive to maintain high availability but do not guarantee 100% uptime. We may
                    perform maintenance that temporarily affects service availability. We are not
                    liable for any downtime or service interruptions.
                  </p>
                </div>

                {/* Limitation of Liability */}
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <h4 className="mb-3 flex items-center font-semibold text-white">
                    <Scale className="mr-2 h-4 w-4 text-[#c4703f]" />
                    Limitation of Liability
                  </h4>
                  <p className="mb-3 text-sm">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND,
                      EXPRESS OR IMPLIED
                    </li>
                    <li>
                      WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                      PUNITIVE DAMAGES
                    </li>
                    <li>
                      OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS
                      PRECEDING THE CLAIM
                    </li>
                    <li>
                      WE ARE NOT RESPONSIBLE FOR YOUR INTERVIEW OUTCOMES OR JOB APPLICATION RESULTS
                    </li>
                    <li>WE DO NOT GUARANTEE THE ACCURACY OF AI-GENERATED FEEDBACK OR CONTENT</li>
                  </ul>
                </div>

                {/* Indemnification */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Indemnification</h4>
                  <p className="text-sm">
                    You agree to indemnify and hold harmless CodeSparring, its officers, directors,
                    employees, and agents from any claims, damages, losses, or expenses (including
                    reasonable attorney fees) arising from your use of the Service, your violation
                    of these Terms, or your violation of any rights of a third party.
                  </p>
                </div>

                {/* Dispute Resolution */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Dispute Resolution</h4>
                  <p className="mb-3 text-sm">
                    <strong className="text-white">Informal Resolution:</strong> Before filing any
                    legal claim, you agree to contact us at legal@codesparring.dev and attempt to
                    resolve the dispute informally for at least 30 days.
                  </p>
                  <p className="mb-3 text-sm">
                    <strong className="text-white">Arbitration:</strong> Any disputes that cannot be
                    resolved informally shall be resolved through binding arbitration in accordance
                    with the rules of the American Arbitration Association. The arbitration shall be
                    conducted in English.
                  </p>
                  <p className="text-sm">
                    <strong className="text-white">Class Action Waiver:</strong> You agree to
                    resolve disputes with us on an individual basis and waive any right to
                    participate in a class action lawsuit or class-wide arbitration.
                  </p>
                </div>

                {/* Termination */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Termination</h4>
                  <p className="text-sm">
                    We may suspend or terminate your account at any time for violation of these
                    Terms or for any other reason at our sole discretion. Upon termination, your
                    right to use the Service ceases immediately. You may delete your account at any
                    time through your Account Settings.
                  </p>
                </div>

                {/* Governing Law */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Governing Law</h4>
                  <p className="text-sm">
                    These Terms shall be governed by the laws of the State of Delaware, United
                    States, without regard to its conflict of law provisions.
                  </p>
                </div>

                {/* Changes to Terms */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Changes to These Terms</h4>
                  <p className="text-sm">
                    We may update these Terms from time to time. We will notify you of material
                    changes by email or through the Service. Your continued use after changes
                    constitutes acceptance of the new Terms.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              id="cookie-policy"
              className="glass-effect scroll-mt-24 border-gray-700 bg-gray-900/50"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Cookie className="h-6 w-6 text-[#c4703f]" />
                  <span>Cookie Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-300">
                <p className="text-sm text-gray-400">
                  <strong>Last updated:</strong> {lastUpdated}
                </p>

                <p>
                  This Cookie Policy explains how CodeSparring uses cookies and similar technologies
                  to recognize you when you visit our platform.
                </p>

                {/* What Are Cookies */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">What Are Cookies?</h4>
                  <p className="text-sm">
                    Cookies are small text files stored on your device when you visit a website.
                    They help websites remember your preferences and improve your experience. We
                    also use localStorage, which is similar but stays on your device.
                  </p>
                </div>

                {/* Types of Cookies */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">Cookies We Use</h4>

                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                      <h5 className="mb-2 font-medium text-green-400">
                        Necessary Cookies (Always Active)
                      </h5>
                      <p className="mb-2 text-sm">
                        Required for the website to function. Cannot be disabled.
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-xs text-gray-400">
                        <li>
                          <strong>Authentication tokens:</strong> Keep you logged in
                        </li>
                        <li>
                          <strong>Session ID:</strong> Maintain your session state
                        </li>
                        <li>
                          <strong>CSRF tokens:</strong> Protect against cross-site attacks
                        </li>
                        <li>
                          <strong>Cookie consent:</strong> Remember your cookie preferences
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                      <h5 className="mb-2 font-medium text-blue-400">
                        Analytics Cookies (Optional)
                      </h5>
                      <p className="mb-2 text-sm">
                        Help us understand how visitors use our site. Only active with your consent.
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-xs text-gray-400">
                        <li>
                          <strong>Firebase Analytics:</strong> Page views, feature usage, session
                          duration
                        </li>
                        <li>
                          <strong>Vercel Analytics:</strong> Performance metrics, page load times
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                      <h5 className="mb-2 font-medium text-purple-400">
                        Functional Cookies (Optional)
                      </h5>
                      <p className="mb-2 text-sm">
                        Enable enhanced functionality and personalization.
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-xs text-gray-400">
                        <li>
                          <strong>Theme preferences:</strong> Dark/light mode settings
                        </li>
                        <li>
                          <strong>Editor settings:</strong> Code editor preferences
                        </li>
                        <li>
                          <strong>UI state:</strong> Sidebar, panel positions
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Managing Cookies */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">
                    Managing Your Cookie Preferences
                  </h4>
                  <p className="mb-3 text-sm">
                    You can manage your cookie preferences at any time:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    <li>
                      <strong className="text-white">Cookie Banner:</strong> Click &quot;Cookie
                      Preferences&quot; at the bottom of any page
                    </li>
                    <li>
                      <strong className="text-white">Account Settings:</strong> Go to your Account
                      page and click &quot;Cookie Preferences&quot;
                    </li>
                    <li>
                      <strong className="text-white">Browser Settings:</strong> Most browsers allow
                      you to block or delete cookies
                    </li>
                  </ul>
                  <p className="mt-3 text-sm text-gray-400">
                    Note: Blocking necessary cookies may prevent the website from functioning
                    properly.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              id="data-processing"
              className="glass-effect scroll-mt-24 border-gray-700 bg-gray-900/50"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Lock className="h-6 w-6 text-[#c4703f]" />
                  <span>Your Data Rights (GDPR & CCPA)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-300">
                <p>
                  Depending on your location, you have specific rights regarding your personal data
                  under regulations like GDPR (Europe) and CCPA (California).
                </p>

                {/* GDPR Rights */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">
                    Your Rights Under GDPR (EU/UK Users)
                  </h4>
                  <p className="mb-3 text-sm">
                    If you are in the European Union or United Kingdom, you have the right to:
                  </p>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      <strong className="text-white">Access:</strong> Request a copy of your
                      personal data
                    </li>
                    <li>
                      <strong className="text-white">Rectification:</strong> Correct inaccurate
                      personal data
                    </li>
                    <li>
                      <strong className="text-white">
                        Erasure (&quot;Right to be Forgotten&quot;):
                      </strong>{" "}
                      Request deletion of your personal data
                    </li>
                    <li>
                      <strong className="text-white">Portability:</strong> Export your data in a
                      machine-readable format
                    </li>
                    <li>
                      <strong className="text-white">Restriction:</strong> Limit how we process your
                      data
                    </li>
                    <li>
                      <strong className="text-white">Object:</strong> Object to processing based on
                      legitimate interests
                    </li>
                    <li>
                      <strong className="text-white">Withdraw Consent:</strong> Withdraw consent at
                      any time for consent-based processing
                    </li>
                  </ul>
                </div>

                {/* CCPA Rights */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">
                    Your Rights Under CCPA (California Users)
                  </h4>
                  <p className="mb-3 text-sm">
                    If you are a California resident, you have the right to:
                  </p>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      <strong className="text-white">Know:</strong> Request information about the
                      personal data we collect
                    </li>
                    <li>
                      <strong className="text-white">Delete:</strong> Request deletion of your
                      personal data
                    </li>
                    <li>
                      <strong className="text-white">Opt-Out:</strong> Opt out of the sale of
                      personal data (we do not sell your data)
                    </li>
                    <li>
                      <strong className="text-white">Non-Discrimination:</strong> Not be
                      discriminated against for exercising your rights
                    </li>
                  </ul>
                  <p className="mt-3 text-sm text-gray-400">
                    <strong>Notice:</strong> We do NOT sell personal information as defined under
                    the CCPA.
                  </p>
                </div>

                {/* How to Exercise Rights */}
                <div className="rounded-lg border border-[#c4703f]/20 bg-[#c4703f]/10 p-4">
                  <h4 className="mb-3 font-semibold text-[#c4703f]">How to Exercise Your Rights</h4>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      <strong className="text-white">Access & Export:</strong> Go to Account
                      Settings &rarr; &quot;Export My Data&quot;
                    </li>
                    <li>
                      <strong className="text-white">Delete Account:</strong> Go to Account Settings
                      &rarr; &quot;Delete My Account&quot;
                    </li>
                    <li>
                      <strong className="text-white">Update Information:</strong> Edit your profile
                      in Account Settings
                    </li>
                    <li>
                      <strong className="text-white">Email Preferences:</strong> Manage
                      notifications in Account Settings
                    </li>
                    <li>
                      <strong className="text-white">Contact Us:</strong> Email
                      privacy@codesparring.dev for any privacy request
                    </li>
                  </ul>
                  <p className="mt-3 text-sm">
                    We respond to all verified requests within{" "}
                    <strong className="text-white">72 hours</strong> (typically within 24 hours).
                  </p>
                </div>

                {/* Data Processing Agreement */}
                <div>
                  <h4 className="mt-6 mb-3 font-semibold text-white">
                    Data Processing Agreement (Enterprise)
                  </h4>
                  <p className="text-sm">
                    For enterprise customers requiring a Data Processing Agreement (DPA) or Business
                    Associate Agreement (BAA), please contact us at legal@codesparring.dev. We
                    provide custom agreements that meet your organization&apos;s compliance
                    requirements.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Bell className="h-6 w-6 text-[#c4703f]" />
                  <span>Data Breach Notification Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>
                  In the unlikely event of a data breach that affects your personal information, we
                  are committed to transparent and timely notification.
                </p>

                <div>
                  <h4 className="mt-4 mb-3 font-semibold text-white">Our Commitment</h4>
                  <ul className="list-inside list-disc space-y-2 text-sm">
                    <li>
                      <strong className="text-white">Regulatory Notification:</strong> We will
                      notify the relevant supervisory authority within 72 hours of becoming aware of
                      a qualifying breach (as required by GDPR)
                    </li>
                    <li>
                      <strong className="text-white">User Notification:</strong> If the breach poses
                      a high risk to your rights and freedoms, we will notify affected users without
                      undue delay via email
                    </li>
                    <li>
                      <strong className="text-white">Transparency:</strong> We will provide clear
                      information about what data was affected, what we are doing to address it, and
                      what steps you can take
                    </li>
                    <li>
                      <strong className="text-white">Investigation:</strong> We will conduct a
                      thorough investigation and implement measures to prevent future incidents
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="mt-4 mb-3 font-semibold text-white">Report a Security Concern</h4>
                  <p className="text-sm">
                    If you discover a security vulnerability or suspect unauthorized access to your
                    account, please report it immediately to{" "}
                    <strong className="text-[#c4703f]">security@codesparring.dev</strong>. We take
                    all reports seriously and will investigate promptly.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card id="contact" className="glass-effect scroll-mt-24 border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-white">
                  <Shield className="h-6 w-6 text-[#c4703f]" />
                  <span>Contact & Compliance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>
                  If you have any questions about our legal policies, need to exercise your data
                  rights, or have compliance inquiries, please contact us:
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-800/50 p-4">
                    <h5 className="mb-2 font-medium text-white">General Legal Inquiries</h5>
                    <p className="text-sm text-[#c4703f]">legal@codesparring.dev</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-4">
                    <h5 className="mb-2 font-medium text-white">Privacy & Data Requests</h5>
                    <p className="text-sm text-[#c4703f]">privacy@codesparring.dev</p>
                    <p className="mt-1 text-xs text-gray-400">Response within 72 hours</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-4">
                    <h5 className="mb-2 font-medium text-white">Security Concerns</h5>
                    <p className="text-sm text-[#c4703f]">security@codesparring.dev</p>
                    <p className="mt-1 text-xs text-gray-400">For vulnerability reports</p>
                  </div>
                  <div className="rounded-lg bg-gray-800/50 p-4">
                    <h5 className="mb-2 font-medium text-white">Customer Support</h5>
                    <p className="text-sm text-[#c4703f]">support@codesparring.dev</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-400">
                    These policies may be updated from time to time. We will notify users of
                    significant changes via email or through the platform interface. The &quot;Last
                    updated&quot; date at the top of each section indicates when that policy was
                    last modified.
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-gray-500">
                    CodeSparring is operated in the United States. For EU users, our representative
                    can be contacted at privacy@codesparring.dev.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
