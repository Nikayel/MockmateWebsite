// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { SubscriptionUnitEconomics } from "@/lib/admin/unit-economics"
import { UnitEconomicsPanel } from "./UnitEconomicsPanel"

const economics: SubscriptionUnitEconomics = {
  period: { start: "2026-09-01T00:00:00.000Z", end: "2026-09-22T23:59:59.000Z" },
  revenuePerSubscriber: 25,
  subscribers: { total: 2, withSessions: 1, monthly: 0, yearly: 2, enterprise: 0 },
  sessionsCounted: 3,
  averageSessionsPerSubscriber: 1.5,
  costs: {
    llmPerSession: 0.0112569,
    voicePerSession: 0.0038434,
    codeExecutionPerSession: 0,
    otherAiPerSession: 0,
    paymentProcessing: {
      costPerSubscriber: 1.4,
      domesticBaseline: 1.025,
      sampleSize: 1,
      source: "stripe_actual",
    },
  },
  projections: [
    {
      sessionsPerMonth: 5,
      variableSessionCost: 0.0755,
      totalCost: 1.4755,
      grossProfit: 23.5245,
      grossMarginPercent: 94.098,
    },
    {
      sessionsPerMonth: 10,
      variableSessionCost: 0.151,
      totalCost: 1.551,
      grossProfit: 23.449,
      grossMarginPercent: 93.796,
    },
    {
      sessionsPerMonth: 20,
      variableSessionCost: 0.302,
      totalCost: 1.702,
      grossProfit: 23.298,
      grossMarginPercent: 93.192,
    },
  ],
  evidence: {
    llmEvents: 72,
    exactTokenEvents: 72,
    voiceEvents: 8,
    voiceSessions: 2,
    voiceMinutes: 2.402,
    executionArchitecture: "browser",
    eventsCoverage: { scanned: 1_151, limit: 10_000, truncated: false },
    sessionsCoverage: { scanned: 86, limit: 10_000, truncated: false },
  },
}

describe("UnitEconomicsPanel", () => {
  it("renders every requested input and the three margin scenarios", () => {
    render(<UnitEconomicsPanel economics={economics} />)

    expect(screen.getByText("Subscriber unit economics")).toBeTruthy()
    expect(screen.getByText("Avg sessions / subscriber")).toBeTruthy()
    expect(screen.getByText("LLM")).toBeTruthy()
    expect(screen.getByText("Voice / transcription")).toBeTruthy()
    expect(screen.getByText("Code execution")).toBeTruthy()
    expect(screen.getAllByText("Payment processing")).toHaveLength(2)
    expect(screen.getByText("5 sessions / month")).toBeTruthy()
    expect(screen.getByText("10 sessions / month")).toBeTruthy()
    expect(screen.getByText("20 sessions / month")).toBeTruthy()
    expect(screen.getByText("94.1%")).toBeTruthy()
    expect(screen.getByText("93.8%")).toBeTruthy()
    expect(screen.getByText("93.2%")).toBeTruthy()
    expect(screen.getByText(/72\/72 calls used provider token counts/)).toBeTruthy()
  })
})
