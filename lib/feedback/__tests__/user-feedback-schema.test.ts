import { describe, it, expect } from "vitest"
import {
  ADMIN_ONLY_FEEDBACK_FIELDS,
  adminFeedbackUpdateSchema,
  FEEDBACK_CONTENT_MAX,
  isUserFeedbackType,
  resolveFeedbackPriority,
  resolveFeedbackStatus,
  resolveFeedbackType,
  userFeedbackSubmissionSchema,
} from "../user-feedback-schema"

const validContent = "The code editor loses my cursor position when tests run."

describe("userFeedbackSubmissionSchema", () => {
  it("accepts a minimal submission and defaults the type", () => {
    const result = userFeedbackSubmissionSchema.safeParse({ content: validContent })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe("feedback")
      expect(result.data.content).toBe(validContent)
    }
  })

  it("accepts the three user-submittable types", () => {
    for (const type of ["feedback", "feature_request", "bug_report"]) {
      expect(userFeedbackSubmissionSchema.safeParse({ type, content: validContent }).success).toBe(
        true
      )
    }
  })

  it("rejects a type the product does not offer", () => {
    // "nps" used to be part of the union even though NPS lives in its own collection.
    expect(
      userFeedbackSubmissionSchema.safeParse({ type: "nps", content: validContent }).success
    ).toBe(false)
  })

  // The core of API-3: a signed-in user posting straight at the endpoint must not be able to
  // seed the triage queue with its own status, priority, notes or vote count, nor claim to be a
  // different user.
  describe("admin-only fields", () => {
    const attempted: Record<string, unknown> = {
      status: "resolved",
      priority: "critical",
      adminNotes: "handled by me",
      votes: 9999,
      assignee: "founder",
      tags: ["vip"],
      userId: "someone-else",
      userEmail: "someone-else@example.com",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      repliedAt: "2020-01-01T00:00:00.000Z",
    }

    it("covers every field the server reserves", () => {
      expect(Object.keys(attempted).sort()).toEqual([...ADMIN_ONLY_FEEDBACK_FIELDS].sort())
    })

    it.each(ADMIN_ONLY_FEEDBACK_FIELDS)("rejects a submission that sets %s", (field) => {
      const result = userFeedbackSubmissionSchema.safeParse({
        content: validContent,
        [field]: attempted[field],
      })
      expect(result.success).toBe(false)
    })

    it("rejects unknown fields outright rather than stripping them", () => {
      const result = userFeedbackSubmissionSchema.safeParse({
        content: validContent,
        somethingNew: true,
      })
      expect(result.success).toBe(false)
    })
  })

  it("rejects empty, whitespace-only and oversized content", () => {
    expect(userFeedbackSubmissionSchema.safeParse({ content: "" }).success).toBe(false)
    expect(userFeedbackSubmissionSchema.safeParse({ content: "   " }).success).toBe(false)
    expect(userFeedbackSubmissionSchema.safeParse({ content: "too short" }).success).toBe(false)
    expect(
      userFeedbackSubmissionSchema.safeParse({ content: "x".repeat(FEEDBACK_CONTENT_MAX + 1) })
        .success
    ).toBe(false)
  })

  it("rejects a non-string content, including one that would coerce", () => {
    expect(userFeedbackSubmissionSchema.safeParse({ content: 12345678901 }).success).toBe(false)
    expect(
      userFeedbackSubmissionSchema.safeParse({ content: { text: validContent } }).success
    ).toBe(false)
  })
})

describe("adminFeedbackUpdateSchema", () => {
  it("accepts a status change", () => {
    const result = adminFeedbackUpdateSchema.safeParse({ id: "abc", status: "in_progress" })
    expect(result.success).toBe(true)
  })

  it("refuses to rewrite what the user actually said", () => {
    const result = adminFeedbackUpdateSchema.safeParse({
      id: "abc",
      content: "something the user never wrote",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown status or priority", () => {
    expect(adminFeedbackUpdateSchema.safeParse({ id: "a", status: "wontfix" }).success).toBe(false)
    expect(adminFeedbackUpdateSchema.safeParse({ id: "a", priority: "urgent" }).success).toBe(false)
  })

  it("requires an id", () => {
    expect(adminFeedbackUpdateSchema.safeParse({ status: "resolved" }).success).toBe(false)
    expect(adminFeedbackUpdateSchema.safeParse({ id: "  ", status: "resolved" }).success).toBe(
      false
    )
  })

  it("caps tag count and tag length", () => {
    expect(
      adminFeedbackUpdateSchema.safeParse({ id: "a", tags: Array(20).fill("spam") }).success
    ).toBe(false)
    expect(adminFeedbackUpdateSchema.safeParse({ id: "a", tags: ["x".repeat(80)] }).success).toBe(
      false
    )
    expect(
      adminFeedbackUpdateSchema.safeParse({ id: "a", tags: ["editor", "voice"] }).success
    ).toBe(true)
  })
})

describe("stored value guards", () => {
  it("falls back instead of throwing on unknown stored values", () => {
    expect(resolveFeedbackType("nps")).toBe("feedback")
    expect(resolveFeedbackType(undefined)).toBe("feedback")
    expect(resolveFeedbackType(null)).toBe("feedback")
    expect(resolveFeedbackType(42)).toBe("feedback")
    expect(resolveFeedbackStatus("archived")).toBe("new")
    expect(resolveFeedbackStatus(undefined)).toBe("new")
    expect(resolveFeedbackPriority("urgent")).toBe("medium")
    expect(resolveFeedbackPriority(undefined)).toBe("medium")
  })

  it("passes known values through unchanged", () => {
    expect(resolveFeedbackType("bug_report")).toBe("bug_report")
    expect(resolveFeedbackStatus("declined")).toBe("declined")
    expect(resolveFeedbackPriority("critical")).toBe("critical")
  })

  it("narrows with isUserFeedbackType", () => {
    expect(isUserFeedbackType("feature_request")).toBe(true)
    expect(isUserFeedbackType("nps")).toBe(false)
    expect(isUserFeedbackType(null)).toBe(false)
  })
})
