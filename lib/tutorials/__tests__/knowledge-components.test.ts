/**
 * Keeps the knowledge-component vocabulary honest.
 *
 * The coverage test is the important one: it walks every authored skill string in the
 * Python tree and fails when one has no canonical mapping. Without it the vocabulary
 * rots exactly the way the free-form `skills` field did, and a silently unmapped skill
 * is invisible (it simply produces no analysis key) rather than loud.
 */
import { describe, it, expect } from "vitest"
import { PYTHON_LEVELS } from "@/lib/tutorials/curriculum"
import {
  KNOWLEDGE_COMPONENTS,
  toKnowledgeComponent,
  toKnowledgeComponents,
  unmappedSkills,
} from "../knowledge-components"

function allAuthoredSkills(): string[] {
  const skills: string[] = []
  for (const level of PYTHON_LEVELS) {
    for (const mod of level.modules) {
      for (const lesson of mod.lessons) skills.push(...(lesson.skills ?? []))
    }
  }
  return skills
}

describe("knowledge components", () => {
  it("resolves synonyms that differ only in case or separator", () => {
    const expected = toKnowledgeComponent("test-design")
    expect(expected).not.toBeNull()
    for (const variant of ["Test Design", "test design", "test_design", "  TEST-DESIGN  "]) {
      expect(toKnowledgeComponent(variant)).toBe(expected)
    }
  })

  it("collapses the near-duplicates the free-form field accumulated", () => {
    expect(toKnowledgeComponent("typing")).toBe(toKnowledgeComponent("type-hints"))
    expect(toKnowledgeComponent("lambdas")).toBe(toKnowledgeComponent("lambda"))
    expect(toKnowledgeComponent("dicts")).toBe(toKnowledgeComponent("dictionaries"))
  })

  it("de-duplicates and sorts, so a row's components are a stable set", () => {
    expect(toKnowledgeComponents(["lists", "tuples", "iteration"])).toEqual(["py.sequences"])
    const many = toKnowledgeComponents(["pytest", "lists", "testing"])
    expect(many).toEqual([...many].sort())
    expect(new Set(many).size).toBe(many.length)
  })

  it("returns an empty array rather than null for absent skills", () => {
    expect(toKnowledgeComponents(undefined)).toEqual([])
    expect(toKnowledgeComponents([])).toEqual([])
  })

  it("drops unmapped skills from the analysis key instead of inventing one", () => {
    expect(toKnowledgeComponents(["totally-made-up-skill"])).toEqual([])
  })

  it("only ever emits declared components", () => {
    const declared = new Set<string>(KNOWLEDGE_COMPONENTS)
    for (const skill of allAuthoredSkills()) {
      const kc = toKnowledgeComponent(skill)
      if (kc) expect(declared.has(kc), `${skill} -> ${kc}`).toBe(true)
    }
  })

  it("maps every skill authored in the Python curriculum", () => {
    // A failure here is a to-do, not a bug: add the new skill to SKILL_TO_KC (or rename
    // it to an existing term) so its observations can accumulate somewhere.
    expect(unmappedSkills(allAuthoredSkills())).toEqual([])
  })
})
