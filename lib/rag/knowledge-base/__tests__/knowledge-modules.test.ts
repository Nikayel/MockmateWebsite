import { describe, expect, it } from "vitest"

import {
  COMPANY_INTERVIEW_KNOWLEDGE,
  companyKnowledgeToDocument,
  getAllCompanyKnowledge,
  getCompanyInterviewKnowledge,
} from "../company-knowledge"
import {
  PATTERN_COMPLEXITY_RULES,
  PROBLEM_COMPLEXITY_DATA,
  getComplexityByLeetCode,
  getComplexityKnowledge,
  getPatternComplexityRules,
  getProblemsWithComplexityData,
  hasComplexityData,
} from "../complexity-knowledge"
import {
  DSA_PATTERN_KNOWLEDGE,
  getAllPatternKnowledge,
  getPatternKnowledge,
  getPatternsByDifficulty,
  getRelatedPatterns,
  patternKnowledgeToDocument,
} from "../dsa-knowledge"

describe("RAG knowledge modules", () => {
  it("keeps DSA pattern knowledge complete and queryable", () => {
    expect(DSA_PATTERN_KNOWLEDGE).toHaveLength(20)
    expect(getAllPatternKnowledge()).toHaveLength(20)
    expect(getPatternKnowledge("graphs")?.displayName).toBe("Graph Traversal")
    expect(getPatternKnowledge("arrays-hashing")?.displayName).toBe("Arrays & Hashing")
    expect(getPatternsByDifficulty("beginner").length).toBeGreaterThan(0)
    expect(getRelatedPatterns("graphs").length).toBeGreaterThan(0)
    expect(patternKnowledgeToDocument(DSA_PATTERN_KNOWLEDGE[0])).toContain("# Arrays & Hashing")
  })

  it("keeps company knowledge complete and queryable", () => {
    expect(COMPANY_INTERVIEW_KNOWLEDGE).toHaveLength(29)
    expect(getAllCompanyKnowledge()).toHaveLength(29)
    expect(getCompanyInterviewKnowledge("google")?.companyName).toBe("Google")
    expect(getCompanyInterviewKnowledge("meta")?.companyName).toContain("Meta")
    expect(companyKnowledgeToDocument(COMPANY_INTERVIEW_KNOWLEDGE[0])).toContain(
      "# Google Interview Guide"
    )
  })

  it("keeps complexity knowledge complete and queryable", () => {
    expect(PROBLEM_COMPLEXITY_DATA).toHaveLength(49)
    expect(PATTERN_COMPLEXITY_RULES).toHaveLength(15)
    expect(getComplexityKnowledge("dsa-two-sum")?.problemTitle).toBe("Two Sum")
    expect(getComplexityByLeetCode(1)?.problemId).toBe("dsa-two-sum")
    expect(getPatternComplexityRules("graphs")?.typicalTimeComplexity).toBe("O(V + E)")
    expect(hasComplexityData("dsa-two-sum")).toBe(true)
    expect(getProblemsWithComplexityData()).toContain("dsa-two-sum")
  })
})
