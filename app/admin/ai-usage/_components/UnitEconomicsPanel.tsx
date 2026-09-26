"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SubscriptionUnitEconomics } from "@/lib/admin/unit-economics"
import { BarChart3, Code2, CreditCard, MessageSquare, Mic, Users } from "lucide-react"

function usd(value: number | null, digits = 2): string {
  return value === null ? "n/a" : `$${value.toFixed(digits)}`
}

function UnitCost({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: number | null
  detail: string
  icon: typeof MessageSquare
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <Icon className="h-4 w-4 text-[#c4703f]" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-green-400">{usd(value, 4)}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
    </div>
  )
}

export function UnitEconomicsPanel({ economics }: { economics: SubscriptionUnitEconomics }) {
  const sessionCostParts = [
    economics.costs.llmPerSession,
    economics.costs.voicePerSession,
    economics.costs.codeExecutionPerSession,
    economics.costs.otherAiPerSession,
  ]
  const totalSessionCost = sessionCostParts.every((cost) => cost !== null)
    ? sessionCostParts.reduce<number>((total, cost) => total + (cost ?? 0), 0)
    : null
  const fee = economics.costs.paymentProcessing
  const isPartial =
    economics.evidence.eventsCoverage.truncated || economics.evidence.sessionsCoverage.truncated
  const exactShare =
    economics.evidence.llmEvents > 0
      ? (economics.evidence.exactTokenEvents / economics.evidence.llmEvents) * 100
      : null

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <BarChart3 className="h-5 w-5 text-[#c4703f]" aria-hidden="true" />
            Subscriber unit economics
          </CardTitle>
          <Badge variant="outline" className="border-green-700/60 text-green-300">
            Ledgered month to date
          </Badge>
        </div>
        <CardDescription className="max-w-3xl leading-5 text-gray-400">
          $25 monthly-plan scenario using costs ledgered for accounts billing today. Margin excludes
          fixed hosting, support, taxes, and refunds.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-800/40 p-4">
            <p className="text-xs tracking-wide text-gray-500 uppercase">Monthly revenue</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">
              {usd(economics.revenuePerSubscriber)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Pro list price</p>
          </div>
          <div className="rounded-lg bg-gray-800/40 p-4">
            <p className="text-xs tracking-wide text-gray-500 uppercase">
              Avg sessions / subscriber
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">
              {economics.averageSessionsPerSubscriber?.toFixed(1) ?? "n/a"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {economics.sessionsCounted} sessions / {economics.subscribers.total} subscribers
            </p>
          </div>
          <div className="rounded-lg bg-gray-800/40 p-4">
            <p className="text-xs tracking-wide text-gray-500 uppercase">Variable cost / session</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-green-400">
              {usd(totalSessionCost, 4)}
            </p>
            <p className="mt-1 text-xs text-gray-500">LLM + voice + execution + other AI</p>
          </div>
          <div className="rounded-lg bg-gray-800/40 p-4">
            <p className="text-xs tracking-wide text-gray-500 uppercase">Payment processing</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">
              {usd(fee.costPerSubscriber)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {fee.source === "stripe_actual"
                ? `Actual Stripe average · ${fee.sampleSize} matching charge${fee.sampleSize === 1 ? "" : "s"}`
                : "Stripe domestic-card estimate"}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-white">Cost inputs</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <UnitCost
              label="LLM"
              value={economics.costs.llmPerSession}
              detail={`${economics.evidence.exactTokenEvents}/${economics.evidence.llmEvents} calls used provider token counts · rate-card priced`}
              icon={MessageSquare}
            />
            <UnitCost
              label="Voice / transcription"
              value={economics.costs.voicePerSession}
              detail={`${economics.evidence.voiceMinutes.toFixed(1)} reported min across ${economics.evidence.voiceSessions} voice sessions`}
              icon={Mic}
            />
            <UnitCost
              label="Code execution"
              value={economics.costs.codeExecutionPerSession}
              detail="Runs in the browser; no metered execution vendor"
              icon={Code2}
            />
            <UnitCost
              label="Payment processing"
              value={fee.costPerSubscriber}
              detail={`Per $25 charge; domestic baseline ${usd(fee.domesticBaseline)}`}
              icon={CreditCard}
            />
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-white">Gross margin scenarios</h3>
              <p className="mt-1 text-xs text-gray-500">
                Same measured cost per session at each usage level
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="h-4 w-4" aria-hidden="true" />
              Cohort: {economics.subscribers.monthly} monthly, {economics.subscribers.yearly}{" "}
              yearly, {economics.subscribers.enterprise} enterprise
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {economics.projections.map((projection) => (
              <div
                key={projection.sessionsPerMonth}
                className="rounded-lg border border-gray-800 p-4"
              >
                <p className="text-sm text-gray-300">
                  {projection.sessionsPerMonth} sessions / month
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold text-green-400">
                  {projection.grossMarginPercent === null
                    ? "n/a"
                    : `${projection.grossMarginPercent.toFixed(1)}%`}
                </p>
                <p className="text-xs text-gray-500">estimated gross margin</p>
                <dl className="mt-4 space-y-2 border-t border-gray-800 pt-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Session costs</dt>
                    <dd className="font-mono text-gray-300">
                      {usd(projection.variableSessionCost, 4)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Total variable cost</dt>
                    <dd className="font-mono text-gray-300">{usd(projection.totalCost)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Gross profit</dt>
                    <dd className="font-mono text-white">{usd(projection.grossProfit)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>

        <p
          className={`border-t border-gray-800 pt-4 text-xs leading-5 ${isPartial ? "text-amber-400" : "text-gray-500"}`}
        >
          {isPartial ? "Partial scan. Treat these figures as directional. " : ""}
          Sample: {economics.subscribers.total} billing subscribers,{" "}
          {economics.subscribers.withSessions} with sessions, {economics.sessionsCounted} sessions.
          LLM token measurement: {exactShare === null ? "n/a" : `${exactShare.toFixed(0)}% exact`}.
          LLM dollars are calculated from provider tokens and the rate table, not reconciled to an
          invoice.
        </p>
      </CardContent>
    </Card>
  )
}
