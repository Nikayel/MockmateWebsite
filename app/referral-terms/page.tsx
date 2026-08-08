import { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Gift, DollarSign, Clock, Shield, XCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Referral Program Terms",
  description: "Terms and conditions for the CodeSparring referral program",
  alternates: {
    canonical: "/referral-terms",
  },
}

export default function ReferralTermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto max-w-4xl px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <Badge className="mb-4 border-yellow-500/30 bg-yellow-500/20 text-yellow-400">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Beta Program
          </Badge>
          <h1 className="font-heading mb-4 text-4xl font-bold text-white">
            Referral Program Terms
          </h1>
          <p className="text-gray-400">Last updated: January 2025</p>
        </div>

        {/* Beta Notice */}
        <Card className="mb-8 border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-yellow-400" />
              <div>
                <h3 className="mb-2 font-semibold text-yellow-400">Beta Program Notice</h3>
                <p className="text-sm text-gray-300">
                  This referral program is currently in beta. We reserve the right to modify,
                  suspend, or terminate the program at any time without prior notice. If system
                  errors, fraud, or abuse are detected, we may void rewards and adjust these terms
                  accordingly. By participating, you acknowledge and accept these conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-6 border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gift className="h-5 w-5 text-purple-400" />
              How the Referral Program Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <div className="flex items-start gap-3">
              <DollarSign className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
              <div>
                <p className="font-medium text-white">$10 Cash Reward (Signup)</p>
                <p className="text-sm text-gray-400">
                  When someone signs up using your referral code, you earn $10 (paid via PayPal).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Gift className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400" />
              <div>
                <p className="font-medium text-white">1 Free Month (Conversion)</p>
                <p className="text-sm text-gray-400">
                  When your referred user upgrades to Pro, you receive 1 free month of Pro
                  subscription.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eligibility Requirements */}
        <Card className="mb-6 border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="h-5 w-5 text-blue-400" />
              Eligibility Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-300">
              To ensure program integrity, rewards are subject to the following requirements:
            </p>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-400">1.</span>
                <span>
                  <strong className="text-white">7-Day Waiting Period:</strong> Cash rewards become
                  eligible 7 days after the referred user signs up.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-400">2.</span>
                <span>
                  <strong className="text-white">Activity Requirement:</strong> The referred user
                  must complete at least 1 interview session before cash rewards are payable.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-400">3.</span>
                <span>
                  <strong className="text-white">Monthly Cap:</strong> Each user can earn rewards
                  for up to 10 referrals per calendar month.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-400">4.</span>
                <span>
                  <strong className="text-white">90-Day Expiration:</strong> Pending rewards expire
                  90 days after creation if not claimed.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* How rewards are claimed.
            The terms above reference rewards expiring "if not claimed", but no
            automated redemption exists: lib/referrals.ts accrues pendingCash and
            pendingFreeMonths, and nothing in the Stripe, entitlement, or quota
            path reads either field. Until redemption is automated, saying so
            plainly is what keeps the program honest. */}
        <Card className="mb-6 border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-green-400" />
              How to Claim Your Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            <p>
              Rewards are tracked automatically on your dashboard but are currently paid out
              manually while automated redemption is being built.
            </p>
            <p>
              To claim, email{" "}
              <a
                href="mailto:support@codesparring.dev?subject=Referral%20reward%20claim"
                className="text-[#c4703f] hover:underline"
              >
                support@codesparring.dev
              </a>{" "}
              from your account address once a reward is eligible. Cash rewards are sent via PayPal
              and free months are applied directly to your subscription, both within 7 business days
              of a verified claim.
            </p>
            <p className="text-sm text-gray-400">
              Rewards will not expire while a claim is pending, and the 90-day window above does not
              run against you if you have emailed us and are waiting on a response.
            </p>
          </CardContent>
        </Card>

        {/* Prohibited Activities */}
        <Card className="mb-6 border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <XCircle className="h-5 w-5 text-red-400" />
              Prohibited Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-300">
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
        <Card className="mb-6 border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-orange-400" />
              Refund & Clawback Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <p>To prevent abuse, rewards are subject to clawback under certain conditions:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>
                  If a referred user requests a refund, all associated pending rewards will be
                  voided.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>
                  If you request a refund or cancel your subscription, pending free month credits
                  may be forfeited.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                <span>
                  Rewards that have already been paid out are non-recoverable, but we reserve the
                  right to offset future rewards.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Rights Reserved */}
        <Card className="mb-6 border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Rights Reserved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <p>CodeSparring reserves the right to:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span>
                  Modify reward amounts, eligibility requirements, or program terms at any time
                </span>
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
            <p className="mt-6 border-t border-gray-800 pt-4 text-sm text-gray-500">
              Rewards are non-transferable and have no cash value except as explicitly stated. This
              program is void where prohibited by law. By participating in the referral program, you
              agree to be bound by these terms and conditions.
            </p>
          </CardContent>
        </Card>

        {/* Contact. This linked to /contact, which has no route anywhere in the
            app, so it 404'd from the exact page a user reads before asking about
            a reward. Points at the support address the rest of the app uses. */}
        <div className="text-center text-sm text-gray-400">
          <p>
            Questions about the referral program?{" "}
            <a
              href="mailto:support@codesparring.dev?subject=Referral%20program%20question"
              className="text-[#c4703f] hover:underline"
            >
              Email support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
