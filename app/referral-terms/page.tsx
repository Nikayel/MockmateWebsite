import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Gift, DollarSign, Clock, Shield, XCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Referral Program Terms | Mockmate",
  description: "Terms and conditions for the Mockmate referral program",
}

export default function ReferralTermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Beta Program
          </Badge>
          <h1 className="text-4xl font-heading font-bold text-white mb-4">
            Referral Program Terms
          </h1>
          <p className="text-gray-400">
            Last updated: January 2025
          </p>
        </div>

        {/* Beta Notice */}
        <Card className="bg-yellow-500/10 border-yellow-500/30 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-yellow-400 font-semibold mb-2">Beta Program Notice</h3>
                <p className="text-gray-300 text-sm">
                  This referral program is currently in beta. We reserve the right to modify, suspend,
                  or terminate the program at any time without prior notice. If system errors, fraud,
                  or abuse are detected, we may void rewards and adjust these terms accordingly.
                  By participating, you acknowledge and accept these conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-gray-900/50 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" />
              How the Referral Program Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">$10 Cash Reward (Signup)</p>
                <p className="text-sm text-gray-400">
                  When someone signs up using your referral code, you earn $10 (paid via PayPal).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">1 Free Month (Conversion)</p>
                <p className="text-sm text-gray-400">
                  When your referred user upgrades to Pro, you receive 1 free month of Pro subscription.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eligibility Requirements */}
        <Card className="bg-gray-900/50 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              Eligibility Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              To ensure program integrity, rewards are subject to the following requirements:
            </p>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <span><strong className="text-white">7-Day Waiting Period:</strong> Cash rewards become eligible 7 days after the referred user signs up.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                <span><strong className="text-white">Activity Requirement:</strong> The referred user must complete at least 1 interview session before cash rewards are payable.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                <span><strong className="text-white">Monthly Cap:</strong> Each user can earn rewards for up to 10 referrals per calendar month.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">4.</span>
                <span><strong className="text-white">90-Day Expiration:</strong> Pending rewards expire 90 days after creation if not claimed.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Prohibited Activities */}
        <Card className="bg-gray-900/50 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              Prohibited Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              The following activities are strictly prohibited and will result in reward forfeiture:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>Self-referrals (using your own code to sign up)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>Creating fake or duplicate accounts to earn rewards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>Using automated tools or bots to generate referrals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>Misleading or incentivizing signups through false promises</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>Posting referral codes on coupon/discount aggregator sites</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>Any form of fraud, abuse, or gaming of the system</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Refund Clawback */}
        <Card className="bg-gray-900/50 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-400" />
              Refund & Clawback Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <p>
              To prevent abuse, rewards are subject to clawback under certain conditions:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>If a referred user requests a refund, all associated pending rewards will be voided.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>If you request a refund or cancel your subscription, pending free month credits may be forfeited.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>Rewards that have already been paid out are non-recoverable, but we reserve the right to offset future rewards.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Rights Reserved */}
        <Card className="bg-gray-900/50 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Rights Reserved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <p>Mockmate reserves the right to:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span>Modify reward amounts, eligibility requirements, or program terms at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span>Void rewards if fraud, abuse, or system errors are detected</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span>Suspend or terminate the program without prior notice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span>Disqualify any participant who violates these terms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span>Make final decisions on all matters relating to the referral program</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 pt-4 border-t border-gray-800 mt-6">
              Rewards are non-transferable and have no cash value except as explicitly stated.
              This program is void where prohibited by law. By participating in the referral program,
              you agree to be bound by these terms and conditions.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="text-center text-gray-400 text-sm">
          <p>
            Questions about the referral program?{" "}
            <Link href="/contact" className="text-[#c4703f] hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
