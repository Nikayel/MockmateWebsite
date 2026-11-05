// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getScenarioById } from "@/lib/scenarios"
import { ScenarioCard } from "../ScenarioCard"
import { ScenarioListRow } from "../ScenarioListRow"

vi.mock("../ScenarioPrerequisites", () => ({
  ScenarioPrerequisites: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

afterEach(cleanup)

describe.each([ScenarioCard, ScenarioListRow])(
  "company alignment in both discovery views",
  (View) => {
    function show(id: string) {
      render(
        <View
          scenario={getScenarioById(id)!}
          isSelected={false}
          isCompleted={false}
          usageLimit={null}
          onSelect={vi.fn()}
          onStart={vi.fn()}
        />
      )
    }

    it("labels a format match and exposes its source on demand", () => {
      show("bugfix-comment-thread-merge")
      const summary = screen.getByText("Google-style · Code comprehension")
      fireEvent.click(summary)
      expect(
        screen.getByText(/An original practice task aligned with the reported format/)
      ).toBeTruthy()
      const link = screen.getByRole("link", {
        name: "Reporting on Google's Gemini-assisted interview pilot",
      })
      expect(link.getAttribute("href")).toContain("businessinsider.com/google-job-interview")
    })

    it("keeps a payment-domain exercise generic", () => {
      show("bugfix-billing-webhook-idempotency")
      expect(screen.getByText("Generic debugging")).toBeTruthy()
      expect(screen.queryByText(/Stripe-style/)).toBeNull()
    })

    it("distinguishes a reported task pattern from a format match", () => {
      show("bugfix-maze-navigation")
      expect(screen.getByText("Meta task pattern · Maze debugging and extension")).toBeTruthy()
    })
  }
)
