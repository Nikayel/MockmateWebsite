import { describe, expect, it } from "vitest"
import { buildBugFixContext } from "@/lib/interview/chat/context-builders"
import { PACK_STATES } from "../machine"
import { buildPackStatePrompt, packHintLadder, recommendedHintLevel } from "../prompt"

describe("recommendedHintLevel", () => {
  it("escalates one level per two consecutive non-advancing turns, capped at 3", () => {
    expect(recommendedHintLevel(0)).toBe(0)
    expect(recommendedHintLevel(1)).toBe(0)
    expect(recommendedHintLevel(2)).toBe(1)
    expect(recommendedHintLevel(3)).toBe(1)
    expect(recommendedHintLevel(4)).toBe(2)
    expect(recommendedHintLevel(6)).toBe(3)
    expect(recommendedHintLevel(20)).toBe(3)
  })
})

describe("packHintLadder", () => {
  it("never writes the fix even at the top level", () => {
    expect(packHintLadder(3).toLowerCase()).toContain("never write the fix")
    expect(packHintLadder(0)).toContain("L0")
  })
})

describe("buildPackStatePrompt", () => {
  it("names the current state, its goal, persona rules, and hard boundaries for every state", () => {
    for (const state of PACK_STATES) {
      const block = buildPackStatePrompt(state, 0)
      expect(block).toContain(`Current state: ${state}.`)
      expect(block).toContain("PERSONA RULES")
      expect(block).toContain("HARD BOUNDARIES")
      expect(block).toContain("one question")
      expect(block).toContain(`You are in ${state}.`)
    }
  })

  it("never contains the words that would preview a later state's mechanics as an answer", () => {
    // The block must not assert the bug/fix; it only frames process.
    const block = buildPackStatePrompt("SCOPE", 1)
    expect(block.toLowerCase()).not.toContain("the bug is")
    expect(block.toLowerCase()).not.toContain("the fix is")
  })

  it("clamps the hint level into 0-3", () => {
    expect(buildPackStatePrompt("FIX", 9)).toContain("current level 3")
    expect(buildPackStatePrompt("FIX", -4)).toContain("current level 0")
  })
})

describe("buildBugFixContext pack branch", () => {
  it("injects the pack state block only when a pack context is supplied", () => {
    const withoutPack = buildBugFixContext("bugfix")
    expect(withoutPack.bugFixContext).not.toContain("STATE-SCOPED CONTROL")

    const withPack = buildBugFixContext("bugfix", undefined, { state: "REPRODUCE", hintLevel: 0 })
    expect(withPack.bugFixContext).toContain("PACK DEBUGGING SESSION")
    expect(withPack.bugFixContext).toContain("Current state: REPRODUCE.")
  })

  it("does not inject the pack block for non-bugfix scenarios", () => {
    const dsa = buildBugFixContext("dsa", undefined, { state: "REPRODUCE" })
    expect(dsa.isBugFix).toBe(false)
    expect(dsa.bugFixContext).toBe("")
  })
})
