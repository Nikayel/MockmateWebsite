/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import SessionDetailPage from "@/app/sessions/[id]/page"
import type { InterviewSession } from "@/lib/types"

const { getDoc, user, router } = vi.hoisted(() => ({
  getDoc: vi.fn(),
  user: { uid: "owner" },
  router: { push: vi.fn() },
}))
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ id: "digest-session" }),
}))
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ firebaseUser: user, loading: false, initialized: true }),
}))
vi.mock("@/lib/firebase-lazy", () => ({ getDbLazy: async () => ({}) }))
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), getDoc }))
vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/lib/hooks/useFeedbackViewAnalytics", () => ({ useFeedbackViewAnalytics: () => {} }))
vi.mock("@/components/practice/FeedbackSections", () => ({ FeedbackSections: () => null }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("saved session result header", () => {
  it.each([50, 0])("shows a single result for a saved score of %s", async (score) => {
    const summary = "All 4 tests passed, but explain the scheduling approach and its complexity."
    const session: InterviewSession = {
      id: "digest-session",
      user_id: "owner",
      topic: "Add Notification Digest Scheduling",
      difficulty: "hard",
      type: "feature",
      started_at: "2026-10-01T12:00:00Z",
      completed_at: "2026-10-01T12:01:35Z",
      feedback_status: "complete",
      feedback: summary,
      structured_feedback: { tldr: summary },
      performance_score: score,
      score_breakdown: { understandingScore: score },
      tests_passed: 4,
      tests_total: 4,
    }
    getDoc.mockResolvedValue({
      id: session.id,
      exists: () => true,
      data: () => session,
    })
    render(<SessionDetailPage />)
    await screen.findByRole("heading", { name: session.topic })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByLabelText(`${score} out of 100`)).toHaveLength(1)
    expect(screen.queryByText(`${score}%`, { selector: "div" })).toBeNull()
    expect(screen.getAllByText("2 min")).toHaveLength(1)
    expect(screen.getAllByText("October 1, 2026")).toHaveLength(1)
    expect(screen.getAllByText(summary)).toHaveLength(1)
    expect(router.push).not.toHaveBeenCalled()
  })
})
