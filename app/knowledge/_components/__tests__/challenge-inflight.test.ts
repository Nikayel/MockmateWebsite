import { describe, it, expect } from "vitest"

/**
 * The in-flight guard on the challenge dialog.
 *
 * The dialog is mounted permanently by the page and only its `card` prop toggles, so
 * `result` and `error` outlive any one card. Submit for card A, close mid-flight,
 * open card B, and the late resolution would land on shared state — card B showing
 * card A's "The model updated" panel, complete with a stability delta and a
 * verification date, for a card that was never challenged.
 *
 * Modelled here rather than rendered: what can break is the sequencing, and it is a
 * handful of ref reads. Mirrors handleSubmit/reset exactly.
 */
function makeDialog() {
  let inFlightFor: string | null = null
  const state = { result: null as string | null, error: null as string | null, submitting: false }

  const reset = () => {
    inFlightFor = null
    state.result = null
    state.error = null
    state.submitting = false
  }

  /** Returns a `settle` you call when the request finally resolves or rejects. */
  const submit = (problemId: string) => {
    inFlightFor = problemId
    state.submitting = true
    return (outcome: { ok: true; correction: string } | { ok: false }) => {
      if (outcome.ok) {
        if (inFlightFor !== problemId) return
        state.result = outcome.correction
      } else {
        if (inFlightFor !== problemId) return
        state.error = "Couldn't record your challenge. Please try again."
      }
      if (inFlightFor === problemId) state.submitting = false
    }
  }

  return { state, reset, submit }
}

describe("challenge dialog in-flight guard", () => {
  it("applies a result that is still the current card's", () => {
    const d = makeDialog()
    const settle = d.submit("two-sum")
    settle({ ok: true, correction: "rerate" })
    expect(d.state.result).toBe("rerate")
    expect(d.state.submitting).toBe(false)
  })

  it("drops card A's success after the dialog was closed", () => {
    const d = makeDialog()
    const settle = d.submit("two-sum")
    d.reset() // Escape / overlay / X while the POST is in flight
    settle({ ok: true, correction: "rerate" })
    expect(d.state.result).toBeNull()
  })

  it("never shows card A's success on card B", () => {
    // The whole point: the page would otherwise assert a correction that never
    // happened, on a card the user never disputed.
    const d = makeDialog()
    const settleA = d.submit("two-sum")
    d.reset()
    d.submit("invert-binary-tree")
    settleA({ ok: true, correction: "A" })
    expect(d.state.result).toBeNull()
  })

  it("never shows card A's error on card B either", () => {
    // The failure path leaked the same way — card B opened pre-populated with
    // "Couldn't record your challenge".
    const d = makeDialog()
    const settleA = d.submit("two-sum")
    d.reset()
    d.submit("invert-binary-tree")
    settleA({ ok: false })
    expect(d.state.error).toBeNull()
  })

  it("does not let a stale resolution clear the new submission's spinner", () => {
    // If the guard only covered result/error, card A resolving would flip
    // submitting=false while card B's request is still running — the Submit button
    // re-enables mid-flight and invites a genuine double submit.
    const d = makeDialog()
    const settleA = d.submit("two-sum")
    d.reset()
    d.submit("invert-binary-tree")
    settleA({ ok: true, correction: "A" })
    expect(d.state.submitting).toBe(true)
  })

  it("still settles a resubmission of the SAME card", () => {
    // The guard keys on problem_id, so retrying the same card must not be dropped.
    const d = makeDialog()
    d.submit("two-sum")
    const settleSecond = d.submit("two-sum")
    settleSecond({ ok: true, correction: "rerate" })
    expect(d.state.result).toBe("rerate")
  })
})
