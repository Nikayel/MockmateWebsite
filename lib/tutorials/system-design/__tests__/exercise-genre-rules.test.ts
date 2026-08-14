/**
 * Proves the artifact rules CATCH things, which the corpus test cannot.
 *
 * `exercise-genres.test.ts` runs the same rules over the real corpus. On a clean corpus it passes
 * whether the rules are sharp or vacuous, so it is not evidence that a bad edit would be stopped.
 * Every case below hands `auditSuppliedExercise` one exercise carrying exactly one defect and
 * asserts it is named. Written before the genre sweep, per the build-the-verifier-before-the-sweep
 * rule in CLAUDE.md.
 */
import { describe, expect, it } from "vitest"

import { auditSuppliedExercise } from "../exercise-genre-rules"
import type { DesignExercise } from "@/lib/tutorials/types"

/** A sound critique exercise. Every case below is this, with one thing broken. */
const SOUND: DesignExercise = {
  id: "sd-l3-read-replicas-practice",
  prompt:
    "Review the proposed design below and name the strongest objection you would raise in the review, then say what you would change.",
  thinkAbout: ["What does the mobile client see immediately after it writes?"],
  modelAnswerOutline: [
    "The strongest objection is read-your-writes: the client writes to the Postgres primary and reads back from a replica that is 200ms behind, so it sees stale data it just replaced.",
    "Fix: route the read-after-write to the primary for a bounded window, or carry the write LSN and wait for the replica to reach it.",
  ],
  supplied: {
    label: "Proposed design",
    body: [
      "## Order service, proposed",
      "",
      "- All writes go to a single Postgres primary in us-east-1.",
      "- Reads are served from five read replicas, one per region, replicating asynchronously.",
      "- Replica lag is observed at 200ms p50 and 1.4s p99 under normal load.",
      "- The mobile client POSTs an order, then immediately GETs the order list to render a confirmation screen.",
      "- A CDN caches the order list response for 30s, keyed on user id.",
    ].join("\n"),
  },
}

function withSupplied(body: string): DesignExercise {
  return { ...SOUND, supplied: { ...SOUND.supplied!, body } }
}

describe("auditSuppliedExercise", () => {
  it("passes a sound critique exercise", () => {
    expect(auditSuppliedExercise(SOUND)).toEqual([])
  })

  it("ignores exercises with no artifact at all", () => {
    const { supplied: _supplied, ...plain } = SOUND
    expect(auditSuppliedExercise(plain as DesignExercise)).toEqual([])
  })

  it("catches an artifact that announces its own defect", () => {
    // The defect this whole file exists for. Nothing throws; the exercise just stops being hard.
    const leaky = withSupplied(
      SOUND.supplied!.body + "\n- The problem is that replicas are stale on read-after-write."
    )
    expect(auditSuppliedExercise(leaky).join(" ")).toMatch(/states the verdict/)
  })

  it("catches the same giveaway moved up into the prompt", () => {
    const leaky: DesignExercise = {
      ...SOUND,
      prompt:
        "Review the design below. The root cause is replica lag on the read-after-write path, so explain how you would fix it.",
    }
    expect(auditSuppliedExercise(leaky).join(" ")).toMatch(/prompt states the verdict/)
  })

  it("catches a stub artifact with nothing in it to find", () => {
    expect(auditSuppliedExercise(withSupplied("- Uses Postgres and replicas.")).join(" ")).toMatch(
      /under the 240 minimum/
    )
  })

  it("catches an artifact long enough to be its own reading assignment", () => {
    const wall = "- Postgres replicates asynchronously to a regional replica pool. ".repeat(80)
    expect(auditSuppliedExercise(withSupplied(wall)).join(" ")).toMatch(/over the 3600 cap/)
  })

  it("catches an artifact pasted into the editable starter answer", () => {
    // The render layer keeps them separate; an author can defeat that with a paste.
    const doubled: DesignExercise = { ...SOUND, starterAnswer: SOUND.supplied!.body }
    expect(auditSuppliedExercise(doubled).join(" ")).toMatch(/duplicated into the editable/)
  })

  it("catches a design-from-scratch prompt bolted onto an artifact", () => {
    const stapled: DesignExercise = {
      ...SOUND,
      prompt: "Design a replication topology for the order service, using the design below.",
    }
    expect(auditSuppliedExercise(stapled).join(" ")).toMatch(/design from scratch while also/)
  })

  it("catches a prompt that never points at the artifact", () => {
    // On the public page the artifact renders in a separate panel; an unreferenced one reads as
    // broken copy to a signed-out visitor, which is the SEO surface.
    const orphaned: DesignExercise = {
      ...SOUND,
      prompt: "Name the strongest objection you would raise in this review.",
    }
    expect(auditSuppliedExercise(orphaned).join(" ")).toMatch(/never points at the artifact/)
  })

  it("accepts a prompt that points at the artifact by its label instead", () => {
    const byLabel: DesignExercise = {
      ...SOUND,
      prompt: "Read the Proposed design and name the strongest objection you would raise.",
    }
    expect(auditSuppliedExercise(byLabel)).toEqual([])
  })

  it("catches a model answer that never engages the artifact", () => {
    // The cheapest way to fake this ticket: keep the generic essay, bolt an artifact beside it.
    const decorative: DesignExercise = {
      ...SOUND,
      modelAnswerOutline: [
        "Replication introduces a consistency tradeoff that the design has to state explicitly.",
        "Pick a consistency model, then make the client contract match it.",
      ],
    }
    expect(auditSuppliedExercise(decorative).join(" ")).toMatch(
      /never names anything in the artifact/
    )
  })

  it("does not flag an incident artifact for reporting symptoms", () => {
    // The false positive that would make authors write vaguer artifacts to appease the guard.
    // Observations are the material of a diagnosis; only verdicts are banned.
    const incident: DesignExercise = {
      id: "sd-l7-golden-signals-practice",
      prompt:
        "Read the incident timeline below and say what is happening, naming the one signal that discriminates between your top two hypotheses.",
      thinkAbout: ["Which signals moved together, and which moved alone?"],
      modelAnswerOutline: [
        "Checkout p99 climbing to 4s while CPU stays flat at 30% rules out saturation of the app tier and points at a downstream wait.",
        "The discriminating signal is Postgres connection pool wait time.",
      ],
      supplied: {
        label: "Incident timeline",
        body: [
          "**14:02** Checkout p99 latency climbs from 380ms to 4s over six minutes.",
          "**14:04** Error rate on /checkout triples, all of them 504 gateway timeouts.",
          "**14:05** App tier CPU is flat at 30%. Memory is flat. No deploy in the last 9 hours.",
          "**14:07** Postgres primary CPU is at 22%. Active connections sit pinned at the pool maximum of 200.",
          "**14:09** A batch export job started at 13:58 and is still running.",
        ].join("\n"),
      },
    }
    expect(auditSuppliedExercise(incident)).toEqual([])
  })

  it("reports every defect at once rather than the first", () => {
    // An authoring agent that gets one violation per run takes one round trip per defect.
    const many: DesignExercise = {
      ...SOUND,
      prompt: "Design something. The root cause is replica lag.",
      supplied: { label: "", body: "- Short." },
    }
    expect(auditSuppliedExercise(many).length).toBeGreaterThanOrEqual(4)
  })
})
