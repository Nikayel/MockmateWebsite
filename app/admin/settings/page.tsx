"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Settings,
  DollarSign,
  Cpu,
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react"
import {
  getAllPricingTiers,
  getProviderCostInfo,
  AI_BUDGET_CAPS,
} from "@/lib/pricing"

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"pricing" | "ai" | "admins">("pricing")

  const pricingTiers = getAllPricingTiers()
  const providerCosts = getProviderCostInfo()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Platform configuration and pricing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        {[
          { id: "pricing", label: "Pricing", icon: DollarSign },
          { id: "ai", label: "AI Providers", icon: Cpu },
          { id: "admins", label: "Admin Users", icon: Shield },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={
              activeTab === tab.id
                ? "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <Card className="bg-blue-900/20 border-blue-500/30">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 text-sm">
                  Pricing is currently managed in <code className="bg-blue-900/30 px-1 rounded">lib/config.ts</code>.
                  Changes require a code deployment.
                </p>
                <p className="text-blue-400/70 text-xs mt-1">
                  Future versions will support dynamic pricing configuration via Firestore.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingTiers.map((tier) => (
              <Card key={tier.tier} className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{tier.name}</CardTitle>
                    {tier.tier === "pro" && (
                      <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                        Popular
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold text-white">
                      ${tier.monthlyPrice}
                    </span>
                    <span className="text-gray-400">/month</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Annual Price</span>
                      <span className="text-white">${tier.annualPrice}/year</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">AI Budget Cap</span>
                      <span className="text-white">${tier.aiBudgetCap}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sessions/Month</span>
                      <span className="text-white">
                        {tier.sessionsPerMonth ?? "Unlimited"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budget Caps Summary */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[#00d9ff]" />
                AI Budget Caps
              </CardTitle>
              <CardDescription className="text-gray-400">
                Monthly AI API spending limits per subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(AI_BUDGET_CAPS).map(([tier, cap]) => (
                  <div
                    key={tier}
                    className="bg-gray-800/50 p-4 rounded-lg text-center"
                  >
                    <div className="text-2xl font-bold text-white">${cap}</div>
                    <div className="text-sm text-gray-400 capitalize">{tier}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Providers Tab */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {/* Provider Costs */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[#00d9ff]" />
                AI Provider Costs
              </CardTitle>
              <CardDescription className="text-gray-400">
                Cost per 1,000 tokens (input + output averaged)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {providerCosts.map((provider) => (
                  <div
                    key={provider.provider}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div>
                      <span className="text-white font-medium">
                        {provider.displayName}
                      </span>
                      <span className="text-gray-500 text-sm ml-2">
                        ({provider.provider})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#00ff88] font-mono">
                        ${provider.costPer1kTokens.toFixed(6)}
                      </span>
                      <span className="text-gray-500 text-sm"> /1K tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Provider Status */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Provider Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Gemini", "Claude", "OpenAI", "Deepseek"].map((provider) => (
                  <div
                    key={provider}
                    className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg"
                  >
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-white text-sm">{provider}</span>
                    <Badge className="ml-auto bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Environment Variables Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Required Environment Variables</CardTitle>
              <CardDescription className="text-gray-400">
                API keys needed for AI providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                {[
                  { key: "GOOGLE_AI_API_KEY", provider: "Gemini" },
                  { key: "ANTHROPIC_API_KEY", provider: "Claude" },
                  { key: "OPENAI_API_KEY", provider: "OpenAI" },
                  { key: "DEEPSEEK_API_KEY", provider: "Deepseek" },
                ].map((env) => (
                  <div
                    key={env.key}
                    className="flex items-center justify-between p-2 bg-gray-800/30 rounded"
                  >
                    <code className="text-[#00d9ff]">{env.key}</code>
                    <span className="text-gray-500">{env.provider}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Users Tab */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Current Admin */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#00d9ff]" />
                Admin Access
              </CardTitle>
              <CardDescription className="text-gray-400">
                Users with admin dashboard access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Environment Admin */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ff88] flex items-center justify-center">
                      <Shield className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Environment Admin</p>
                      <p className="text-gray-500 text-sm">
                        Configured via <code className="text-[#00d9ff]">ADMIN_USER_ID</code>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                    Super Admin
                  </Badge>
                </div>

                {/* Info about RBAC */}
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-300 text-sm">
                        Role-based access control is available. Additional admins can be added
                        to the <code className="bg-blue-900/30 px-1 rounded">admin_roles</code> Firestore collection.
                      </p>
                      <div className="mt-2 text-xs text-blue-400/70">
                        Available roles: <span className="text-blue-300">super_admin, admin, analyst, support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 pb-3">Permission</th>
                      <th className="text-center text-gray-400 pb-3">Super Admin</th>
                      <th className="text-center text-gray-400 pb-3">Admin</th>
                      <th className="text-center text-gray-400 pb-3">Analyst</th>
                      <th className="text-center text-gray-400 pb-3">Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "View Analytics", roles: [true, true, true, false] },
                      { name: "View Revenue", roles: [true, true, true, false] },
                      { name: "Export Data", roles: [true, true, true, false] },
                      { name: "View Users", roles: [true, true, true, true] },
                      { name: "Manage Users", roles: [true, true, false, true] },
                      { name: "View Errors", roles: [true, true, true, true] },
                      { name: "Manage Settings", roles: [true, true, false, false] },
                      { name: "Manage Admins", roles: [true, false, false, false] },
                    ].map((perm) => (
                      <tr key={perm.name} className="border-b border-gray-800/50">
                        <td className="py-3 text-white">{perm.name}</td>
                        {perm.roles.map((has, i) => (
                          <td key={i} className="text-center py-3">
                            {has ? (
                              <CheckCircle className="h-4 w-4 text-green-400 mx-auto" />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Audit Logging</CardTitle>
              <CardDescription className="text-gray-400">
                Admin actions are logged for security and compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Admin Audit Log</p>
                  <p className="text-gray-500 text-sm">
                    Stored in <code className="text-[#00d9ff]">admin_audit_log</code> collection
                  </p>
                </div>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  Enabled
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
