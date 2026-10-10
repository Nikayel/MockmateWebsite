import type { PracticePlan } from "../schema"
export const fixturePlan: PracticePlan = {
  userId: "owner",
  sourceSessionId: "source",
  revision: "11111111-1111-4111-8111-111111111111",
  savedAt: "2026-10-10T09:00:00.000Z",
  reminderAt: null,
  timezone: "UTC",
  reminderStatus: "none",
  nextAttemptAt: null,
  attempts: 0,
  recommendation: {
    scenarioId: "next",
    title: "Next task",
    type: "dsa",
    difficulty: "easy",
    estimatedMinutes: 15,
    href: "/interview?scenario=next&source=next-practice&fromSession=source",
    reason: "Same pattern",
    focus: "Explain the invariant",
    focusSource: "transfer",
  },
}
