/**
 * The feedback-slot decision, extracted so it is testable as a table.
 *
 * The 2026-08-25 P0 lived exactly here: the slot's inline conditional and the
 * SignupPrompt gate disagreed about what "post-submit" meant for a guest, and
 * no test could see the seam. The decision is now one pure function; the page
 * renders whatever it returns.
 *
 * The guestConversion axis exists because Firebase commits the new user
 * before the sign-in popup even resolves: without it, the first frame after
 * auth rendered the signed-in feedback view with a wrong 0% (covering), and a
 * failed migration stranded a signed-in user on that empty view forever
 * (failed).
 */

import { describe, expect, it } from "vitest"
import { resolveResultSurface } from "../resolve-result-surface"

const postSubmit = { showFeedback: true, showPostInterviewDiscussion: false }

describe("resolveResultSurface", () => {
  it("shows the workspace until a submit ends the interview", () => {
    expect(
      resolveResultSurface({
        showFeedback: false,
        showPostInterviewDiscussion: false,
        hasUser: true,
        guestConversion: "idle",
      })
    ).toBe("workspace")
    expect(
      resolveResultSurface({
        showFeedback: false,
        showPostInterviewDiscussion: false,
        hasUser: false,
        guestConversion: "idle",
      })
    ).toBe("workspace")
  })

  it("locks the result region for a signed-out guest in any post-submit phase", () => {
    expect(resolveResultSurface({ ...postSubmit, hasUser: false, guestConversion: "idle" })).toBe(
      "guest_lock"
    )
    expect(
      resolveResultSurface({
        showFeedback: false,
        showPostInterviewDiscussion: true,
        hasUser: false,
        guestConversion: "idle",
      })
    ).toBe("guest_lock")
    // Covering before auth lands (popup open) still shows the lock.
    expect(
      resolveResultSurface({ ...postSubmit, hasUser: false, guestConversion: "covering" })
    ).toBe("guest_lock")
  })

  it("hands a mid-conversion user the feedback view, whose loading state is the cover", () => {
    expect(
      resolveResultSurface({ ...postSubmit, hasUser: true, guestConversion: "covering" })
    ).toBe("feedback_view")
  })

  it("returns a failed conversion to the lock so the guest can retry", () => {
    expect(resolveResultSurface({ ...postSubmit, hasUser: true, guestConversion: "failed" })).toBe(
      "guest_lock"
    )
  })

  it("gives settled signed-in users the feedback view", () => {
    expect(resolveResultSurface({ ...postSubmit, hasUser: true, guestConversion: "idle" })).toBe(
      "feedback_view"
    )
  })
})
